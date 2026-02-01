import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestResult, TestRunIngest } from "@justinmiehle/shared";
import type {
	FullConfig,
	FullResult,
	TestResult as PlaywrightTestResult,
	Reporter,
	Suite,
	TestCase,
} from "@playwright/test/reporter";

const DEFAULT_MAX_ATTACHMENT_BYTES = 1024 * 1024; // 1 MB
const CODE_SNIPPET_CONTEXT_LINES = 10;

interface PanoptesReporterOptions {
	convexUrl?: string;
	projectName?: string;
	environment?: string;
	ci?: boolean;
	maxAttachmentSize?: number; // Maximum attachment size in bytes (default: 1MB)
	debug?: boolean; // Enable debug logging for attachments
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

function getBranch(): string | undefined {
	// GitHub Actions: GITHUB_REF contains the branch or PR ref
	if (process.env.GITHUB_REF) {
		// GITHUB_REF can be:
		// - refs/heads/branch-name (for push events)
		// - refs/pull/N/merge (for pull_request events)
		// - refs/tags/tag-name (for tag events)
		const ref = process.env.GITHUB_REF;
		// Extract branch name from refs/heads/branch-name
		if (ref.startsWith("refs/heads/")) {
			return ref.replace("refs/heads/", "");
		}
		// For PRs, extract the branch from GITHUB_HEAD_REF if available
		if (process.env.GITHUB_HEAD_REF) {
			return process.env.GITHUB_HEAD_REF;
		}
		// Fallback to the ref as-is (might be useful)
		return ref;
	}
	// CircleCI
	if (process.env.CIRCLE_BRANCH) return process.env.CIRCLE_BRANCH;
	// GitLab CI
	if (process.env.CI_COMMIT_REF_NAME) return process.env.CI_COMMIT_REF_NAME;
	// Try to get from git in local environment
	try {
		const { execSync } = require("node:child_process");
		return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
	} catch {
		return undefined;
	}
}

function getGitHubRunId(): number | undefined {
	if (process.env.GITHUB_RUN_ID) {
		const runId = Number.parseInt(process.env.GITHUB_RUN_ID, 10);
		if (!Number.isNaN(runId)) {
			return runId;
		}
	}
	return undefined;
}

function getPRNumber(): number | undefined {
	// GitHub Actions: GITHUB_REF for pull_request events is refs/pull/N/merge
	if (process.env.GITHUB_REF) {
		const ref = process.env.GITHUB_REF;
		const match = ref.match(/^refs\/pull\/(\d+)\//);
		if (match) {
			const prNumber = Number.parseInt(match[1], 10);
			if (!Number.isNaN(prNumber)) {
				return prNumber;
			}
		}
	}
	// Also check GITHUB_EVENT_PATH if available (contains full event JSON)
	if (process.env.GITHUB_EVENT_PATH) {
		try {
			const fs = require("node:fs");
			const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf-8"));
			if (eventData.pull_request?.number) {
				return eventData.pull_request.number;
			}
		} catch {
			// Silently fail if we can't read the event file
		}
	}
	return undefined;
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
			"node_modules/@justinmiehle/reporter-playwright/package.json"
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
	private options: Required<PanoptesReporterOptions> & {
		maxAttachmentSize: number;
		debug: boolean;
	};
	private startTime = 0;
	private tests: TestResult[] = [];
	private suites: Map<string, { name: string; file: string; tests: TestResult[] }> = new Map();

	constructor(options: PanoptesReporterOptions = {}) {
		this.options = {
			convexUrl: options.convexUrl || process.env.CONVEX_URL || "",
			projectName: options.projectName || process.env.PANOPTES_PROJECT_NAME || "default-project",
			environment: options.environment || process.env.NODE_ENV || "development",
			ci: options.ci ?? process.env.CI === "true",
			maxAttachmentSize: options.maxAttachmentSize ?? DEFAULT_MAX_ATTACHMENT_BYTES,
			debug: options.debug ?? false,
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

		// Detect if this is a visual test run
		// Check if any test file path contains "visual" or if tests have screenshot attachments
		const hasVisualTests =
			this.tests.some(
				(t) =>
					t.file.toLowerCase().includes("visual") ||
					t.attachments?.some((att) => att.name.toLowerCase().includes("screenshot"))
			) || this.tests.some((t) => t.tags?.includes("visual"));

		const testType: "unit" | "integration" | "e2e" | "visual" = hasVisualTests ? "visual" : "e2e";

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
			testType,
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
			reporterVersion: getReporterVersion(),
			branch: getBranch(),
			githubRunId: getGitHubRunId(),
			prNumber: getPRNumber(),
			tests: this.tests,
			suites: suiteData,
		};

		console.log(
			`[Panoptes] Sending test run: project=${this.options.projectName}, testType=${testType}, totalTests=${this.tests.length}, passed=${passedTests}, failed=${failedTests}, skipped=${skippedTests}`
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
		if (!attachments?.length) {
			if (this.options.debug) {
				console.log("[Panoptes] No attachments found for this test");
			}
			return [];
		}

		const result: Array<{ name: string; contentType: string; bodyBase64: string }> = [];
		const imageTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

		if (this.options.debug) {
			console.log(
				`[Panoptes] Processing ${attachments.length} attachment(s) (max size: ${this.options.maxAttachmentSize} bytes)`
			);
		}

		for (const att of attachments) {
			if (!imageTypes.has(att.contentType)) {
				if (this.options.debug) {
					console.log(
						`[Panoptes] Skipping attachment "${att.name}" - unsupported content type: ${att.contentType}`
					);
				}
				continue;
			}

			let base64: string | undefined;

			// Handle in-memory attachment body
			if (att.body) {
				try {
					const buf = Buffer.isBuffer(att.body) ? att.body : Buffer.from(att.body);
					if (buf.length > this.options.maxAttachmentSize) {
						if (this.options.debug) {
							console.warn(
								`[Panoptes] Skipping attachment "${att.name}" - size ${buf.length} bytes exceeds limit of ${this.options.maxAttachmentSize} bytes`
							);
						}
						continue;
					}
					base64 = buf.toString("base64");
					if (this.options.debug) {
						console.log(
							`[Panoptes] Successfully processed attachment "${att.name}" from body (${buf.length} bytes)`
						);
					}
				} catch (error) {
					console.warn(`[Panoptes] Failed to process attachment "${att.name}" from body:`, error);
					continue;
				}
			} else if (att.path) {
				// Handle file path attachment - need to resolve path correctly
				try {
					let resolvedPath: string;

					// Check if path is already absolute
					if (path.isAbsolute(att.path)) {
						resolvedPath = att.path;
					} else {
						// Try resolving relative to test-results directory first (Playwright's default output)
						const testResultsDir = path.resolve(process.cwd(), "test-results");
						const testResultsPath = path.resolve(testResultsDir, att.path);

						// Also try resolving relative to current working directory
						const cwdPath = path.resolve(process.cwd(), att.path);

						// Check which path exists
						if (fs.existsSync(testResultsPath)) {
							resolvedPath = testResultsPath;
						} else if (fs.existsSync(cwdPath)) {
							resolvedPath = cwdPath;
						} else {
							// Try the path as-is (might be relative to attachment directory)
							resolvedPath = att.path;
						}
					}

					// Verify the file exists
					if (!fs.existsSync(resolvedPath)) {
						if (this.options.debug) {
							console.warn(
								`[Panoptes] Attachment file not found: "${att.path}" (resolved: "${resolvedPath}")`
							);
						}
						continue;
					}

					const buf = fs.readFileSync(resolvedPath);
					if (buf.length > this.options.maxAttachmentSize) {
						if (this.options.debug) {
							console.warn(
								`[Panoptes] Skipping attachment "${att.name}" - size ${buf.length} bytes exceeds limit of ${this.options.maxAttachmentSize} bytes`
							);
						}
						continue;
					}
					base64 = buf.toString("base64");
					if (this.options.debug) {
						console.log(
							`[Panoptes] Successfully processed attachment "${att.name}" from path "${resolvedPath}" (${buf.length} bytes)`
						);
					}
				} catch (error) {
					console.warn(
						`[Panoptes] Failed to read attachment "${att.name}" from path "${att.path}":`,
						error
					);
					continue;
				}
			} else {
				if (this.options.debug) {
					console.warn(`[Panoptes] Attachment "${att.name}" has neither body nor path`);
				}
				continue;
			}

			if (base64) {
				result.push({
					name: att.name,
					contentType: att.contentType,
					bodyBase64: base64,
				});
			}
		}

		if (this.options.debug) {
			console.log(
				`[Panoptes] Successfully collected ${result.length} attachment(s) out of ${attachments.length} total`
			);
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
