import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestResult, TestRunIngest } from "@justinmiehle/shared";
import type {
	FullConfig,
	FullResult,
	TestResult as PlaywrightTestResult,
	Reporter,
	Suite,
	TestCase,
} from "@playwright/test/reporter";

const MAX_ATTACHMENT_BYTES = 1024 * 1024; // 1 MB
const CODE_SNIPPET_CONTEXT_LINES = 10;

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

	onBegin(config: FullConfig, suite: Suite) {
		this.startTime = Date.now();
		this.tests = [];
		this.suites.clear();
	}

	onTestBegin(test: TestCase) {
		console.log(`[Panoptes] Test begin: ${test.title}`);
		// Test is starting, we'll capture result in onTestEnd
	}

	onTestEnd(test: TestCase, result: PlaywrightTestResult) {
		console.log(`[Panoptes] Test end: ${test.title}, status: ${result.status}`);
		// Extract file path from test location
		const filePath = test.location?.file ?? "unknown";

		// Get project name from test's parent suite
		const project = test.parent?.project();
		const projectName = project?.name;

		const stdout = this.chunksToString(result.stdout);
		const stderr = this.chunksToString(result.stderr);
		const attachments = this.collectAttachments(result.attachments);
		const steps =
			result.steps?.length > 0
				? result.steps.map((s) => ({ title: s.title, duration: s.duration }))
				: undefined;
		const codeSnippet = this.readCodeSnippet(filePath, test.location?.line);

		const testResult: TestResult = {
			name: test.title,
			file: filePath,
			line: test.location?.line,
			column: test.location?.column,
			status: this.mapStatus(result.status),
			duration: result.duration || 0,
			error: result.error?.message,
			errorDetails: result.error?.stack || result.error?.snippet,
			retries: result.retry,
			suite: test.parent?.title,
			tags: test.tags,
			stdout: stdout || undefined,
			stderr: stderr || undefined,
			codeSnippet,
			attachments: attachments.length > 0 ? attachments : undefined,
			metadata: {
				workerIndex: result.workerIndex,
				retry: result.retry,
				projectName: projectName,
				...(steps && { steps }),
			},
		};

		this.tests.push(testResult);

		// Track suites - use file path as fallback for suite name
		const suiteName = test.parent?.title || filePath;
		if (!this.suites.has(suiteName)) {
			this.suites.set(suiteName, {
				name: suiteName,
				file: filePath,
				tests: [],
			});
		}
		this.suites.get(suiteName)?.tests.push(testResult);
	}

	async onEnd(result: FullResult) {
		const endTime = Date.now();
		const duration = endTime - this.startTime;

		console.log(`[Panoptes] Reporter onEnd called. Total tests collected: ${this.tests.length}`);
		if (this.tests.length === 0) {
			console.warn(
				"[Panoptes] WARNING: No tests were collected! This might mean tests weren't actually executed."
			);
		}

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

		const testRun: TestRunIngest = {
			projectName: this.options.projectName,
			framework: "playwright",
			testType: "e2e", // Playwright is typically e2e tests
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
			triggeredBy: getTriggeredBy(),
			tests: this.tests,
			suites: suiteData,
		};

		console.log(
			`[Panoptes] Sending test run: project=${this.options.projectName}, testType=e2e, totalTests=${this.tests.length}, passed=${passedTests}, failed=${failedTests}, skipped=${skippedTests}`
		);

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

	printsToStdout() {
		return false;
	}

	private mapStatus(status: string): "passed" | "failed" | "skipped" | "running" {
		switch (status) {
			case "passed":
				return "passed";
			case "failed":
				return "failed";
			case "skipped":
				return "skipped";
			default:
				return "running";
		}
	}

	private chunksToString(chunks: Array<string | Buffer> | undefined): string | undefined {
		if (!chunks?.length) return undefined;
		const parts = chunks.map((c) => (typeof c === "string" ? c : c.toString("utf-8")));
		const out = parts.join("");
		return out.trim() || undefined;
	}

	private collectAttachments(
		attachments: PlaywrightTestResult["attachments"] | undefined
	): Array<{ name: string; contentType: string; bodyBase64: string }> {
		if (!attachments?.length) return [];
		const result: Array<{ name: string; contentType: string; bodyBase64: string }> = [];
		const imageTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
		for (const att of attachments) {
			if (!imageTypes.has(att.contentType)) continue;
			let base64: string | undefined;
			if (att.body) {
				const buf = Buffer.isBuffer(att.body) ? att.body : Buffer.from(att.body);
				if (buf.length > MAX_ATTACHMENT_BYTES) continue;
				base64 = buf.toString("base64");
			} else if (att.path) {
				try {
					const buf = fs.readFileSync(att.path);
					if (buf.length > MAX_ATTACHMENT_BYTES) continue;
					base64 = buf.toString("base64");
				} catch {
					// skip
				}
			}
			if (base64) {
				result.push({
					name: att.name,
					contentType: att.contentType,
					bodyBase64: base64,
				});
			}
		}
		return result;
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
}
