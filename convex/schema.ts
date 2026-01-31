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
			v.literal("other")
		),
		testType: v.union(
			v.literal("unit"),
			v.literal("integration"),
			v.literal("e2e"),
			v.literal("visual")
		),
		status: v.union(
			v.literal("passed"),
			v.literal("failed"),
			v.literal("skipped"),
			v.literal("running")
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
		commitSha: v.optional(v.string()),
		ciRunId: v.optional(v.id("ciRuns")),
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
			v.literal("running")
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
		status: v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped")),
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
			v.literal("frequently_failing")
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

	ciRuns: defineTable({
		projectId: v.id("projects"),
		workflowId: v.number(),
		workflowName: v.string(),
		runId: v.number(),
		status: v.union(
			v.literal("queued"),
			v.literal("in_progress"),
			v.literal("completed"),
			v.literal("waiting")
		),
		conclusion: v.optional(
			v.union(
				v.literal("success"),
				v.literal("failure"),
				v.literal("neutral"),
				v.literal("cancelled"),
				v.literal("skipped"),
				v.literal("timed_out"),
				v.literal("action_required")
			)
		),
		commitSha: v.string(),
		commitMessage: v.optional(v.string()),
		branch: v.string(),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		htmlUrl: v.string(),
		metadata: v.optional(v.any()),
	})
		.index("by_project", ["projectId"])
		.index("by_commit", ["commitSha"])
		.index("by_status", ["status"]),

	pullRequests: defineTable({
		projectId: v.id("projects"),
		prNumber: v.number(),
		title: v.string(),
		state: v.union(v.literal("open"), v.literal("closed"), v.literal("merged")),
		author: v.string(),
		branch: v.string(),
		baseBranch: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
		htmlUrl: v.string(),
		commitSha: v.optional(v.string()),
		metadata: v.optional(v.any()),
	})
		.index("by_project", ["projectId"])
		.index("by_state", ["state"]),

	codeSnippets: defineTable({
		testId: v.id("tests"),
		file: v.string(),
		startLine: v.number(),
		endLine: v.number(),
		content: v.string(),
		language: v.optional(v.string()),
		fetchedAt: v.number(),
	})
		.index("by_test", ["testId"])
		.index("by_file", ["file"]),

	cloudAgentRuns: defineTable({
		projectId: v.id("projects"),
		testId: v.optional(v.id("tests")),
		triggeredBy: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed")
		),
		agentId: v.optional(v.string()),
		branch: v.optional(v.string()),
		createdAt: v.number(),
		completedAt: v.optional(v.number()),
		htmlUrl: v.optional(v.string()),
		metadata: v.optional(v.any()),
	})
		.index("by_project", ["projectId"])
		.index("by_status", ["status"]),
});
