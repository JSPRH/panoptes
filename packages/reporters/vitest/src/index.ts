import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { CoverageIngest, FileCoverage, TestResult, TestRunIngest } from "@justinmiehle/shared";
import type { Reporter } from "vitest/reporters";

const CODE_SNIPPET_CONTEXT_LINES = 10;
const DEFAULT_COVERAGE_PATH = "coverage/coverage-final.json";

interface PanoptesReporterOptions {
	convexUrl?: string;
	projectName?: string;
	environment?: string;
	ci?: boolean;
}

function getCommitSha(): string | undefined {
	// Check CI environment first (GitHub Actions, etc.)
	if (process.env.GITHUB_SHA) {
		return process.env.GITHUB_SHA;
	}
	if (process.env.CIRCLE_SHA1) {
		return process.env.CIRCLE_SHA1;
	}
	if (process.env.GITLAB_CI_COMMIT_SHA) {
		return process.env.GITLAB_CI_COMMIT_SHA;
	}
	// Try to get from git in local environment
	// Note: This requires git to be available and may fail silently
	try {
		const { execSync } = require("node:child_process");
		return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
	} catch {
		// Git not available or not in a git repo
		return undefined;
	}
}

function getTriggeredBy(): string | undefined {
	// CI: use provider's actor/username
	if (process.env.GITHUB_ACTOR) return process.env.GITHUB_ACTOR;
	if (process.env.CIRCLE_USERNAME) return process.env.CIRCLE_USERNAME;
	if (process.env.GITLAB_USER_LOGIN) return process.env.GITLAB_USER_LOGIN;
	// Local: machine username
	if (process.env.USER) return process.env.USER;
	try {
		return os.userInfo().username;
	} catch {
		return undefined;
	}
}

function getReporterVersion(): string | undefined {
	try {
		// Try to read package.json from the package directory
		// When bundled, this will be relative to the dist/index.js location
		const currentFile =
			typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
		const packageJsonPath = path.resolve(path.dirname(currentFile), "../package.json");
		if (fs.existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
				version?: string;
			};
			return packageJson.version;
		}
		// Fallback: try from node_modules if installed as a dependency
		const nodeModulesPath = path.resolve(
			process.cwd(),
			"node_modules/@justinmiehle/reporter-vitest/package.json"
		);
		if (fs.existsSync(nodeModulesPath)) {
			const packageJson = JSON.parse(fs.readFileSync(nodeModulesPath, "utf-8")) as {
				version?: string;
			};
			return packageJson.version;
		}
	} catch {
		// Silently fail - version is optional
	}
	return undefined;
}

export default class PanoptesReporter implements Reporter {
	private options: Required<PanoptesReporterOptions>;
	private startTime = 0;
	private tests: TestResult[] = [];
	private suites: Map<string, { name: string; file: string; tests: TestResult[] }> = new Map();

	constructor(options: PanoptesReporterOptions = {}) {
		this.options = {
			convexUrl: options.convexUrl || process.env.CONVEX_URL || "",
			projectName: options.projectName || process.env.PANOPTES_PROJECT_NAME || "default-project",
			environment: options.environment || process.env.NODE_ENV || "development",
			ci: options.ci ?? process.env.CI === "true",
		};
	}

	onInit() {
		this.startTime = Date.now();
	}

	onTestRunStart() {
		this.tests = [];
		this.suites.clear();
	}

	// biome-ignore lint/suspicious/noExplicitAny: Vitest reporter interface doesn't provide strict types
	onTestCaseResult(test: any) {
		const filePath = test.file?.name || test.filepath || test.task?.file?.filepath || "unknown";
		const line = test.file?.line ?? test.location?.line ?? test.task?.location?.line;
		const codeSnippet = this.readCodeSnippet(filePath, line);
		const diagnostic = this.getDiagnostic(test);
		const artifactsList = this.getArtifacts(test);
		const metadata: Record<string, unknown> = {
			type: test.type,
			mode: test.mode,
			...(diagnostic && { diagnostic: diagnostic }),
			...(artifactsList && artifactsList.length > 0 && { artifacts: artifactsList }),
		};

		// Vitest provides status in test.task.result.state for completed tests
		// For skipped/todo tests, test.task.mode is 'skip' or 'todo' and result is undefined
		const task = test.task;
		let rawStatus: string;
		if (task?.mode === "skip" || task?.mode === "todo") {
			rawStatus = "skipped";
		} else if (task?.result?.state) {
			rawStatus = task.result.state; // 'pass', 'fail', etc.
		} else {
			rawStatus = test.status || test.state || "unknown";
		}

		const testResult: TestResult = {
			name: test.name || test.title || task?.name || "Unknown test",
			file: filePath,
			line,
			column: test.file?.column ?? test.location?.column ?? task?.location?.column,
			status: this.mapStatus(rawStatus),
			duration: task?.result?.duration ?? test.duration ?? 0,
			error: task?.result?.errors?.[0]?.message ?? test.error?.message,
			errorDetails: task?.result?.errors?.[0]?.stack ?? test.error?.stack,
			retries: task?.result?.retryCount ?? test.retryCount,
			suite: task?.suite?.name ?? test.suite?.name,
			tags: task?.meta?.tags ?? test.meta?.tags,
			codeSnippet,
			metadata,
		};

		this.tests.push(testResult);

		// Track suites - use task.suite if available, otherwise fall back to test.suite
		const suite = task?.suite ?? test.suite;
		if (suite) {
			const suiteKey = suite.name || filePath;
			if (!this.suites.has(suiteKey)) {
				this.suites.set(suiteKey, {
					name: suite.name || suiteKey,
					file: filePath,
					tests: [],
				});
			}
			this.suites.get(suiteKey)?.tests.push(testResult);
		}
	}

	async onTestRunEnd() {
		const endTime = Date.now();
		const duration = endTime - this.startTime;

		const passedTests = this.tests.filter((t) => t.status === "passed").length;
		const failedTests = this.tests.filter((t) => t.status === "failed").length;
		const skippedTests = this.tests.filter((t) => t.status === "skipped").length;

		// Build suite data
		const suiteData = Array.from(this.suites.values()).map((suite) => {
			const suiteTests = suite.tests;
			const passed = suiteTests.filter((t) => t.status === "passed").length;
			const failed = suiteTests.filter((t) => t.status === "failed").length;
			const skipped = suiteTests.filter((t) => t.status === "skipped").length;

			const status: "passed" | "failed" | "skipped" =
				failed > 0 ? "failed" : skipped === suiteTests.length ? "skipped" : "passed";
			return {
				name: suite.name,
				file: suite.file,
				status,
				duration: suiteTests.reduce((sum, t) => sum + t.duration, 0),
				totalTests: suiteTests.length,
				passedTests: passed,
				failedTests: failed,
				skippedTests: skipped,
			};
		});

		const coverage = this.readCoverage();

		const testRun: TestRunIngest = {
			projectName: this.options.projectName,
			framework: "vitest",
			testType: "unit", // Vitest is typically unit tests, but could be configured
			startedAt: this.startTime,
			completedAt: endTime,
			duration,
			totalTests: this.tests.length,
			passedTests,
			failedTests,
			skippedTests,
			environment: this.options.environment,
			ci: this.options.ci,
			commitSha: getCommitSha(),
			reporterVersion: getReporterVersion(),
			tests: this.tests,
			suites: suiteData,
			...(coverage && { coverage }),
		};

		if (!this.options.convexUrl) {
			console.warn("[Panoptes] CONVEX_URL not set. Test results will not be sent.");
			return;
		}

		try {
			const response = await fetch(`${this.options.convexUrl}/http/ingestTestRunHttp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(testRun),
			});

			if (!response.ok) {
				const error = await response.text();
				console.error(`[Panoptes] Failed to send test results: ${error}`);
			} else {
				const result = (await response.json()) as { testRunId?: string };
				console.log(`[Panoptes] Test results sent successfully. Test Run ID: ${result.testRunId}`);
			}
		} catch (error) {
			console.error("[Panoptes] Error sending test results:", error);
		}
	}

	private mapStatus(status: string): "passed" | "failed" | "skipped" | "running" {
		switch (status?.toLowerCase()) {
			case "passed":
			case "pass":
				return "passed";
			case "failed":
			case "fail":
				return "failed";
			case "skipped":
			case "skip":
			case "todo": // Vitest uses 'todo' mode for todo tests, treat as skipped
				return "skipped";
			default:
				return "running";
		}
	}

	private readCodeSnippet(filePath: string, line: number | undefined): TestResult["codeSnippet"] {
		if (line == null) return undefined;
		let absPath: string;
		try {
			absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
			if (!fs.existsSync(absPath)) return undefined;
		} catch {
			return undefined;
		}
		try {
			const content = fs.readFileSync(absPath, "utf-8");
			const lines = content.split("\n");
			const start = Math.max(0, line - 1 - CODE_SNIPPET_CONTEXT_LINES);
			const end = Math.min(lines.length, line + CODE_SNIPPET_CONTEXT_LINES);
			const slice = lines.slice(start, end).join("\n");
			const ext = path.extname(filePath).toLowerCase();
			const language =
				ext === ".ts" || ext === ".tsx"
					? "typescript"
					: ext === ".js" || ext === ".jsx"
						? "javascript"
						: undefined;
			return {
				startLine: start + 1,
				endLine: end,
				content: slice,
				language,
			};
		} catch {
			return undefined;
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: Vitest reporter interface
	private getDiagnostic(test: any): Record<string, unknown> | undefined {
		try {
			if (typeof test.diagnostic !== "function") return undefined;
			const d = test.diagnostic();
			if (!d) return undefined;
			return {
				duration: d.duration,
				slow: d.slow,
				flaky: d.flaky,
				retryCount: d.retryCount,
				repeatCount: d.repeatCount,
				heap: d.heap,
				startTime: d.startTime,
			};
		} catch {
			return undefined;
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: Vitest reporter interface; artifacts() is experimental
	private getArtifacts(test: any): Array<{ type: string }> | undefined {
		try {
			if (typeof test.artifacts !== "function") return undefined;
			const list = test.artifacts();
			if (!Array.isArray(list) || list.length === 0) return undefined;
			return list.map((a: { type?: string }) => ({ type: a?.type ?? "unknown" }));
		} catch {
			return undefined;
		}
	}

	/**
	 * Read Istanbul-style coverage from coverage/coverage-final.json (or PANOPTES_COVERAGE_PATH).
	 * Enable coverage in Vitest (e.g. coverage: { provider: 'v8', reporter: ['json'] }) for LOC to be sent.
	 */
	private readCoverage(): CoverageIngest | undefined {
		const coveragePath =
			process.env.PANOPTES_COVERAGE_PATH ?? path.resolve(process.cwd(), DEFAULT_COVERAGE_PATH);
		try {
			if (!fs.existsSync(coveragePath)) return undefined;
			const raw = fs.readFileSync(coveragePath, "utf-8");
			const data = JSON.parse(raw) as Record<
				string,
				{
					s?: Record<string, number>;
					b?: Record<string, number[]>;
					f?: Record<string, number>;
					statementMap?: Record<string, unknown>;
					branchMap?: Record<string, unknown>;
					fnMap?: Record<string, unknown>;
				}
			>;
			const files: Record<string, FileCoverage> = {};
			let totalLines = 0;
			let coveredLines = 0;
			for (const [filePath, entry] of Object.entries(data)) {
				if (!entry || typeof entry !== "object") continue;
				// Istanbul does not always have 'l' (line counts); derive from statementMap + s if needed
				const statementCounts = entry.s ?? {};
				const statementMap = (
					entry as {
						statementMap?: Record<string, { start: { line: number }; end: { line: number } }>;
					}
				).statementMap;
				let linesTotal = 0;
				let linesCovered = 0;
				if (statementMap && typeof statementMap === "object") {
					const lineHits = new Map<number, number>();
					for (const [id, loc] of Object.entries(statementMap)) {
						if (!loc?.start?.line) continue;
						const count = statementCounts[id] ?? 0;
						const line = loc.start.line;
						lineHits.set(line, (lineHits.get(line) ?? 0) + count);
					}
					linesTotal = lineHits.size;
					for (const hits of Array.from(lineHits.values())) {
						if (hits > 0) linesCovered += 1;
					}
				}
				const statementsTotal = Object.keys(statementCounts).length;
				const statementsCovered = Object.values(statementCounts).filter(
					(c) => typeof c === "number" && c > 0
				).length;
				if (statementsTotal > 0 && linesTotal === 0) {
					linesTotal = statementsTotal;
					linesCovered = statementsCovered;
				}
				totalLines += linesTotal;
				coveredLines += linesCovered;
				// Use relative path for consistency
				const relPath = path.isAbsolute(filePath)
					? path.relative(process.cwd(), filePath)
					: filePath;
				files[relPath] = {
					linesCovered,
					linesTotal: linesTotal || 1,
					statementsCovered: statementsTotal > 0 ? statementsCovered : undefined,
					statementsTotal: statementsTotal > 0 ? statementsTotal : undefined,
				};
			}
			if (Object.keys(files).length === 0) return undefined;
			return {
				summary: {
					lines: { total: totalLines, covered: coveredLines },
					statements: { total: totalLines, covered: coveredLines },
				},
				files,
			};
		} catch {
			return undefined;
		}
	}
}
