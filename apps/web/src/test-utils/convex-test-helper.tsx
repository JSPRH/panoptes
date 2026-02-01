import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import schema from "@convex/schema";
import { convexTest } from "convex-test";

import * as generatedApiModule from "@convex/_generated/api";
import * as generatedServerModule from "@convex/_generated/server";
import * as anomaliesModule from "@convex/anomalies";
import * as anomaliesActionsModule from "@convex/anomaliesActions";
import * as ciAnalysisModule from "@convex/ciAnalysis";
import * as ciAnalysisActionsModule from "@convex/ciAnalysisActions";
import * as codebaseAnalysisModule from "@convex/codebaseAnalysis";
import * as codebaseAnalysisActionsModule from "@convex/codebaseAnalysisActions";
import * as featuresModule from "@convex/features";
import * as githubModule from "@convex/github";
import * as scheduledModule from "@convex/scheduled";
import * as testFailureAnalysisModule from "@convex/testFailureAnalysis";
import * as testFailureAnalysisActionsModule from "@convex/testFailureAnalysisActions";
import * as testSuggestionsModule from "@convex/testSuggestions";
import * as testSuggestionsActionsModule from "@convex/testSuggestionsActions";
// Manually import modules for edge-runtime compatibility
import * as testsModule from "@convex/tests";

// Create modules object - paths relative to convex/ directory
const modules: Record<string, () => Promise<unknown>> = {
	"./tests.ts": () => Promise.resolve(testsModule),
	"./anomalies.ts": () => Promise.resolve(anomaliesModule),
	"./anomaliesActions.ts": () => Promise.resolve(anomaliesActionsModule),
	"./github.ts": () => Promise.resolve(githubModule),
	"./features.ts": () => Promise.resolve(featuresModule),
	"./testFailureAnalysis.ts": () => Promise.resolve(testFailureAnalysisModule),
	"./testFailureAnalysisActions.ts": () => Promise.resolve(testFailureAnalysisActionsModule),
	"./testSuggestions.ts": () => Promise.resolve(testSuggestionsModule),
	"./testSuggestionsActions.ts": () => Promise.resolve(testSuggestionsActionsModule),
	"./ciAnalysis.ts": () => Promise.resolve(ciAnalysisModule),
	"./ciAnalysisActions.ts": () => Promise.resolve(ciAnalysisActionsModule),
	"./codebaseAnalysis.ts": () => Promise.resolve(codebaseAnalysisModule),
	"./codebaseAnalysisActions.ts": () => Promise.resolve(codebaseAnalysisActionsModule),
	"./scheduled.ts": () => Promise.resolve(scheduledModule),
	"./_generated/api.ts": () => Promise.resolve(generatedApiModule),
	"./_generated/server.ts": () => Promise.resolve(generatedServerModule),
};

// Helper to create a test instance
export function createTestInstance() {
	return convexTest(schema, modules);
}

// Helper to set up test data for common scenarios
export async function setupTestProject(t: ReturnType<typeof convexTest>) {
	const projectId = await t.mutation(api.tests.ingestTestRun, {
		projectName: "Test Project",
		framework: "vitest",
		testType: "unit",
		startedAt: Date.now(),
		totalTests: 0,
		passedTests: 0,
		failedTests: 0,
		skippedTests: 0,
		tests: [],
	});

	// Get the project ID from the test run
	const testRuns = await t.query(api.tests.getTestRuns, { limit: 1 });
	const project = testRuns?.[0]?.projectId;

	return project as Id<"projects">;
}

// Helper to create a test run with tests
export async function createTestRun(
	t: ReturnType<typeof convexTest>,
	projectId: Id<"projects">,
	options?: {
		testType?: "unit" | "integration" | "e2e" | "visual";
		passedTests?: number;
		failedTests?: number;
		skippedTests?: number;
	}
) {
	const now = Date.now();
	const testType = options?.testType || "unit";
	const passedTests = options?.passedTests || 5;
	const failedTests = options?.failedTests || 0;
	const skippedTests = options?.skippedTests || 0;
	const totalTests = passedTests + failedTests + skippedTests;

	const testRunId = await t.mutation(api.tests.ingestTestRun, {
		projectId,
		projectName: "Test Project",
		framework: "vitest",
		testType,
		startedAt: now,
		completedAt: now + 1000,
		duration: 1000,
		totalTests,
		passedTests,
		failedTests,
		skippedTests,
		tests: [
			...Array.from({ length: passedTests }, (_, i) => ({
				name: `Test ${i + 1}`,
				file: `test${i + 1}.test.ts`,
				status: "passed" as const,
				duration: 100,
			})),
			...Array.from({ length: failedTests }, (_, i) => ({
				name: `Failing Test ${i + 1}`,
				file: `failing${i + 1}.test.ts`,
				status: "failed" as const,
				duration: 50,
				error: "Test failed",
			})),
			...Array.from({ length: skippedTests }, (_, i) => ({
				name: `Skipped Test ${i + 1}`,
				file: `skipped${i + 1}.test.ts`,
				status: "skipped" as const,
				duration: 0,
			})),
		],
	});

	return testRunId;
}
