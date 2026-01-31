import type { TestResult, TestRunIngest } from "@justinmiehle/shared";
import type { Reporter } from "@playwright/test/reporter";

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

	// biome-ignore lint/suspicious/noExplicitAny: Playwright reporter interface doesn't provide strict types
	onBegin(config: any, suite: any) {
		this.startTime = Date.now();
		this.tests = [];
		this.suites.clear();
	}

	// biome-ignore lint/suspicious/noExplicitAny: Playwright reporter interface doesn't provide strict types
	onTestBegin(test: any) {
		// Test is starting, we'll capture result in onTestEnd
	}

	// biome-ignore lint/suspicious/noExplicitAny: Playwright reporter interface doesn't provide strict types
	onTestEnd(test: any, result: any) {
		const testResult: TestResult = {
			name: test.title,
			file: test.location?.file || test.file || "unknown",
			line: test.location?.line,
			column: test.location?.column,
			status: this.mapStatus(result.status),
			duration: result.duration || 0,
			error: result.error?.message,
			errorDetails: result.error?.stack || result.error?.snippet,
			retries: result.retry,
			suite: test.parent?.title,
			tags: test.tags,
			metadata: {
				workerIndex: result.workerIndex,
				retry: result.retry,
				projectName: test.project()?.name,
			},
		};

		this.tests.push(testResult);

		// Track suites
		const suiteName = test.parent?.title || test.location?.file || "unknown";
		if (!this.suites.has(suiteName)) {
			this.suites.set(suiteName, {
				name: suiteName,
				file: test.location?.file || test.file || "unknown",
				tests: [],
			});
		}
		this.suites.get(suiteName)?.tests.push(testResult);
	}

	// biome-ignore lint/suspicious/noExplicitAny: Playwright reporter interface doesn't provide strict types
	async onEnd(result: any) {
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
			tests: this.tests,
			suites: suiteData,
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
}
