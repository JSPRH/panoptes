import { convexTest } from "convex-test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

// Import generated files
import * as generatedApiModule from "../_generated/api";
import * as generatedServerModule from "../_generated/server";
import * as anomaliesModule from "../anomalies";
import * as anomaliesActionsModule from "../anomaliesActions";
import * as ciAnalysisModule from "../ciAnalysis";
import * as ciAnalysisActionsModule from "../ciAnalysisActions";
import * as codebaseAnalysisModule from "../codebaseAnalysis";
import * as codebaseAnalysisActionsModule from "../codebaseAnalysisActions";
import * as featuresModule from "../features";
import * as githubModule from "../github";
import * as scheduledModule from "../scheduled";
import * as testFailureAnalysisModule from "../testFailureAnalysis";
import * as testFailureAnalysisActionsModule from "../testFailureAnalysisActions";
import * as testSuggestionsModule from "../testSuggestions";
import * as testSuggestionsActionsModule from "../testSuggestionsActions";
// Manually import all Convex function files since import.meta.glob doesn't work in edge-runtime
import * as testsModule from "../tests";

// Create modules object manually - paths should be relative to convex/ directory
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

// Helper to create test instance with aggregate component registered
// The aggregate component needs access to _generated files, so we use the same modules
function createTestInstance() {
	const t = convexTest(schema, modules);
	// Register the aggregate component - it needs a schema and modules
	// We use a minimal schema for the aggregate's internal state
	const aggregateSchema = defineSchema({
		aggregateState: defineTable({
			namespace: v.string(),
			key: v.string(),
			count: v.number(),
		}),
	});
	// Use the same modules so the aggregate can access _generated files
	t.registerComponent("testDefinitionAggregate", aggregateSchema, modules);
	return t;
}

describe("Convex Backend Integration Tests", () => {
	// Note: Tests that use aggregate functionality are skipped because the aggregate
	// component requires internal Convex modules (btree, public) that aren't available
	// in the convex-test environment. These tests would need the aggregate component
	// to be properly registered with all its dependencies.
	it.skip("should return empty dashboard stats when no data exists", async () => {
		const t = createTestInstance();

		const stats = await t.query(api.tests.getDashboardStats);

		expect(stats).toMatchObject({
			projectCount: 0,
			testRunCount: 0,
			pyramid: {
				unit: { total: 0, passed: 0, failed: 0 },
				integration: { total: 0, passed: 0, failed: 0 },
				e2e: { total: 0, passed: 0, failed: 0 },
				visual: { total: 0, passed: 0, failed: 0 },
			},
		});
	});

	// Note: This test is skipped because it uses aggregate functionality
	// See note above about aggregate component requirements
	it.skip("should return projects after ingesting test run", async () => {
		const t = createTestInstance();

		await t.mutation(api.tests.ingestTestRun, {
			projectName: "Test Project",
			framework: "vitest",
			testType: "unit",
			startedAt: Date.now(),
			totalTests: 5,
			passedTests: 4,
			failedTests: 1,
			skippedTests: 0,
			tests: [
				{ name: "Test 1", file: "test1.test.ts", status: "passed", duration: 100 },
				{ name: "Test 2", file: "test2.test.ts", status: "passed", duration: 100 },
				{ name: "Test 3", file: "test3.test.ts", status: "passed", duration: 100 },
				{ name: "Test 4", file: "test4.test.ts", status: "passed", duration: 100 },
				{ name: "Test 5", file: "test5.test.ts", status: "failed", duration: 50, error: "Failed" },
			],
		});

		const projects = await t.query(api.tests.getProjects);
		expect(projects).toHaveLength(1);
		expect(projects[0].name).toBe("Test Project");

		const stats = await t.query(api.tests.getDashboardStats);
		expect(stats.projectCount).toBe(1);
		expect(stats.testRunCount).toBe(1);
		expect(stats.pyramid.unit.total).toBe(5);
		expect(stats.pyramid.unit.passed).toBe(4);
		expect(stats.pyramid.unit.failed).toBe(1);
	});

	it("should return test runs with filters", async () => {
		const t = createTestInstance();

		const now = Date.now();

		// Create test runs
		await t.mutation(api.tests.ingestTestRun, {
			projectName: "Project 1",
			framework: "vitest",
			testType: "unit",
			startedAt: now,
			totalTests: 5,
			passedTests: 5,
			failedTests: 0,
			skippedTests: 0,
			tests: [],
		});

		await t.mutation(api.tests.ingestTestRun, {
			projectName: "Project 1",
			framework: "playwright",
			testType: "e2e",
			startedAt: now + 1000,
			totalTests: 3,
			passedTests: 2,
			failedTests: 1,
			skippedTests: 0,
			tests: [],
		});

		const allRuns = await t.query(api.tests.getTestRuns, { limit: 10 });
		expect(allRuns).toHaveLength(2);

		const unitRuns = await t.query(api.tests.getTestRuns, {
			testType: "unit",
			limit: 10,
		});
		expect(unitRuns).toHaveLength(1);
		expect(unitRuns[0].testType).toBe("unit");

		const e2eRuns = await t.query(api.tests.getTestRuns, {
			testType: "e2e",
			limit: 10,
		});
		expect(e2eRuns).toHaveLength(1);
		expect(e2eRuns[0].testType).toBe("e2e");
	});

	it("should handle test run history", async () => {
		const t = createTestInstance();

		const now = Date.now();
		const oneDayAgo = now - 86400000;

		await t.mutation(api.tests.ingestTestRun, {
			projectName: "Project 1",
			framework: "vitest",
			testType: "unit",
			startedAt: oneDayAgo,
			completedAt: oneDayAgo + 1000,
			duration: 1000,
			totalTests: 10,
			passedTests: 8,
			failedTests: 2,
			skippedTests: 0,
			tests: [],
		});

		await t.mutation(api.tests.ingestTestRun, {
			projectName: "Project 1",
			framework: "vitest",
			testType: "unit",
			startedAt: now,
			completedAt: now + 2000,
			duration: 2000,
			totalTests: 10,
			passedTests: 10,
			failedTests: 0,
			skippedTests: 0,
			tests: [],
		});

		const history = await t.query(api.tests.getTestRunHistory, {
			startTimestamp: oneDayAgo - 1000,
			limit: 100,
		});

		expect(history.length).toBeGreaterThan(0);
		expect(history[0].passRate).toBeGreaterThan(0);
	});
});
