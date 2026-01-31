import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	projects: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		repository: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}),

	testRuns: defineTable({
		projectId: v.id("projects"),
		framework: v.union(
			v.literal("vitest"),
			v.literal("playwright"),
			v.literal("jest"),
			v.literal("other"),
		),
		testType: v.union(
			v.literal("unit"),
			v.literal("integration"),
			v.literal("e2e"),
			v.literal("visual"),
		),
		status: v.union(
			v.literal("passed"),
			v.literal("failed"),
			v.literal("skipped"),
			v.literal("running"),
		),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		duration: v.optional(v.number()), // milliseconds
		totalTests: v.number(),
		passedTests: v.number(),
		failedTests: v.number(),
		skippedTests: v.number(),
		environment: v.optional(v.string()),
		ci: v.optional(v.boolean()),
		metadata: v.optional(v.any()),
	})
		.index("by_project", ["projectId"])
		.index("by_project_and_type", ["projectId", "testType"])
		.index("by_started_at", ["startedAt"]),

	tests: defineTable({
		testRunId: v.id("testRuns"),
		projectId: v.id("projects"),
		name: v.string(),
		file: v.string(),
		line: v.optional(v.number()),
		column: v.optional(v.number()),
		status: v.union(
			v.literal("passed"),
			v.literal("failed"),
			v.literal("skipped"),
			v.literal("running"),
		),
		duration: v.number(), // milliseconds
		error: v.optional(v.string()),
		errorDetails: v.optional(v.string()),
		retries: v.optional(v.number()),
		suite: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		metadata: v.optional(v.any()),
	})
		.index("by_test_run", ["testRunId"])
		.index("by_project", ["projectId"])
		.index("by_file", ["file"])
		.index("by_status", ["status"]),

	testSuites: defineTable({
		testRunId: v.id("testRuns"),
		projectId: v.id("projects"),
		name: v.string(),
		file: v.string(),
		status: v.union(
			v.literal("passed"),
			v.literal("failed"),
			v.literal("skipped"),
		),
		duration: v.number(),
		totalTests: v.number(),
		passedTests: v.number(),
		failedTests: v.number(),
		skippedTests: v.number(),
	})
		.index("by_test_run", ["testRunId"])
		.index("by_project", ["projectId"]),

	anomalies: defineTable({
		projectId: v.id("projects"),
		testId: v.id("tests"),
		testName: v.string(),
		type: v.union(
			v.literal("flaky"),
			v.literal("slow"),
			v.literal("resource_intensive"),
			v.literal("frequently_failing"),
		),
		severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
		detectedAt: v.number(),
		details: v.optional(v.any()),
		resolved: v.optional(v.boolean()),
		resolvedAt: v.optional(v.number()),
	})
		.index("by_project", ["projectId"])
		.index("by_type", ["type"])
		.index("by_test", ["testId"])
		.index("by_resolved", ["resolved"]),
});
