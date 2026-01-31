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

	// Test run = one batch of test executions (e.g. CI ran all unit tests). See docs/TERMINOLOGY.md.
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
		triggeredBy: v.optional(v.string()),
		reporterVersion: v.optional(v.string()),
		metadata: v.optional(v.any()),
	})
		.index("by_project", ["projectId"])
		.index("by_project_and_type", ["projectId", "testType"])
		.index("by_started_at", ["startedAt"]),

	// Test execution = one specific time a test was run. See docs/TERMINOLOGY.md.
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
		stdout: v.optional(v.string()),
		stderr: v.optional(v.string()),
	})
		.index("by_test_run", ["testRunId"])
		.index("by_project", ["projectId"])
		.index("by_file", ["file"])
		.index("by_status", ["status"])
		.index("by_project_and_status", ["projectId", "status"])
		.searchIndex("search_name", {
			searchField: "name",
			filterFields: ["projectId", "status"],
		})
		.searchIndex("search_file", {
			searchField: "file",
			filterFields: ["projectId", "status"],
		}),

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
		insights: v.optional(v.string()),
		insightsGeneratedAt: v.optional(v.number()),
		rootCause: v.optional(v.string()),
		suggestedFix: v.optional(v.string()),
		confidence: v.optional(v.number()),
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

	ciRunJobs: defineTable({
		ciRunId: v.id("ciRuns"),
		jobId: v.number(),
		name: v.string(),
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
				v.literal("cancelled"),
				v.literal("skipped"),
				v.literal("neutral")
			)
		),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		runnerName: v.optional(v.string()),
		workflowName: v.string(),
	}).index("by_ciRun", ["ciRunId"]),

	ciRunJobSteps: defineTable({
		jobId: v.id("ciRunJobs"),
		stepNumber: v.number(),
		name: v.string(),
		status: v.union(v.literal("queued"), v.literal("in_progress"), v.literal("completed")),
		conclusion: v.optional(
			v.union(
				v.literal("success"),
				v.literal("failure"),
				v.literal("cancelled"),
				v.literal("skipped")
			)
		),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		logs: v.string(),
	}).index("by_job", ["jobId"]),

	ciRunAnalysis: defineTable({
		ciRunId: v.id("ciRuns"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
		analysis: v.object({
			title: v.optional(v.string()),
			summary: v.string(),
			rootCause: v.string(),
			proposedFix: v.string(),
			proposedTest: v.string(),
			isFlaky: v.boolean(),
			confidence: v.number(),
			cursorDeeplink: v.optional(v.string()),
			cursorPrompt: v.optional(v.string()),
			cursorBackgroundAgentData: v.optional(
				v.object({
					repository: v.string(),
					ref: v.string(),
					prompt: v.string(),
				})
			),
			cursorAgentId: v.optional(v.string()),
			cursorAgentUrl: v.optional(v.string()),
		}),
		analyzedAt: v.number(),
		model: v.string(),
	}).index("by_ciRun", ["ciRunId"]),

	testFailureAnalysis: defineTable({
		testId: v.id("tests"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
		summary: v.optional(v.string()),
		rootCause: v.optional(v.string()),
		suggestedFix: v.optional(v.string()),
		codeLocation: v.optional(v.string()),
		confidence: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
		relatedFiles: v.optional(v.array(v.string())),
		cursorDeeplink: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.optional(v.number()),
	}).index("by_test", ["testId"]),

	ciRunParsedTests: defineTable({
		ciRunId: v.id("ciRuns"),
		stepId: v.id("ciRunJobSteps"),
		testName: v.string(),
		file: v.optional(v.string()),
		line: v.optional(v.number()),
		status: v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped")),
		error: v.optional(v.string()),
		errorDetails: v.optional(v.string()),
		stdout: v.optional(v.string()),
		stderr: v.optional(v.string()),
		duration: v.optional(v.number()),
		parsedAt: v.number(),
	})
		.index("by_ciRun", ["ciRunId"])
		.index("by_step", ["stepId"]),

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

	testAttachments: defineTable({
		testId: v.id("tests"),
		name: v.string(),
		contentType: v.string(),
		storageId: v.id("_storage"),
		createdAt: v.optional(v.number()),
	}).index("by_test", ["testId"]),

	fileCoverage: defineTable({
		testRunId: v.id("testRuns"),
		projectId: v.id("projects"),
		file: v.string(),
		linesCovered: v.number(),
		linesTotal: v.number(),
		lineDetails: v.optional(v.string()),
		statementDetails: v.optional(v.string()), // JSON: array of statement coverage info
		statementsCovered: v.optional(v.number()),
		statementsTotal: v.optional(v.number()),
		branchesCovered: v.optional(v.number()),
		branchesTotal: v.optional(v.number()),
		functionsCovered: v.optional(v.number()),
		functionsTotal: v.optional(v.number()),
	})
		.index("by_test_run", ["testRunId"])
		.index("by_project", ["projectId"]),

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

	// Pre-computed dashboard overview (one doc). Updated incrementally in ingestTestRun.
	dashboardStats: defineTable({
		projectCount: v.number(),
		testRunCount: v.number(),
		pyramid: v.object({
			unit: v.object({ total: v.number(), passed: v.number(), failed: v.number() }),
			integration: v.object({ total: v.number(), passed: v.number(), failed: v.number() }),
			e2e: v.object({ total: v.number(), passed: v.number(), failed: v.number() }),
			visual: v.object({ total: v.number(), passed: v.number(), failed: v.number() }),
		}),
		updatedAt: v.number(),
	}).index("by_updated_at", ["updatedAt"]),

	// Latest status per test definition (projectId + name + file + line) for pyramid counts.
	testDefinitionLatest: defineTable({
		projectId: v.id("projects"),
		testType: v.union(
			v.literal("unit"),
			v.literal("integration"),
			v.literal("e2e"),
			v.literal("visual")
		),
		definitionKey: v.string(),
		status: v.union(
			v.literal("passed"),
			v.literal("failed"),
			v.literal("skipped"),
			v.literal("running")
		),
		lastRunStartedAt: v.number(),
	})
		.index("by_project_type_key", ["projectId", "testType", "definitionKey"])
		.index("by_project", ["projectId"]),

	testSuggestions: defineTable({
		projectId: v.id("projects"),
		file: v.string(),
		commitSha: v.string(), // For cache invalidation
		suggestions: v.array(
			v.object({
				title: v.string(),
				description: v.string(),
				value: v.number(), // 0-1 score
				difficulty: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
				estimatedRuntime: v.optional(v.number()), // milliseconds
				testType: v.union(v.literal("unit"), v.literal("integration"), v.literal("e2e")),
				uncoveredLines: v.array(v.number()),
				prompt: v.string(), // Full prompt for Cursor
				cursorDeeplink: v.string(),
			})
		),
		generatedAt: v.number(),
		model: v.string(),
	})
		.index("by_file_commit", ["file", "commitSha"])
		.index("by_project", ["projectId"]),
});
