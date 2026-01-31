// Aggregates temporarily disabled to unblock - will re-enable once components are working
// import { TableAggregate } from "@convex-dev/aggregate";
import { paginationOptsValidator } from "convex/server";
import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
// import { components } from "./_generated/api";
import { api } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { Doc, Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";

// Aggregates temporarily commented out - causing deployment issues
// Will re-enable once basic functions are working

export const ingestTestRun = mutation({
	args: {
		projectId: v.optional(v.id("projects")),
		projectName: v.string(),
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
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		duration: v.optional(v.number()),
		totalTests: v.number(),
		passedTests: v.number(),
		failedTests: v.number(),
		skippedTests: v.number(),
		environment: v.optional(v.string()),
		ci: v.optional(v.boolean()),
		commitSha: v.optional(v.string()),
		triggeredBy: v.optional(v.string()),
		reporterVersion: v.optional(v.string()),
		tests: v.array(
			v.object({
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
				duration: v.number(),
				error: v.optional(v.string()),
				errorDetails: v.optional(v.string()),
				retries: v.optional(v.number()),
				suite: v.optional(v.string()),
				tags: v.optional(v.array(v.string())),
				metadata: v.optional(v.any()),
				stdout: v.optional(v.string()),
				stderr: v.optional(v.string()),
				codeSnippet: v.optional(
					v.object({
						startLine: v.number(),
						endLine: v.number(),
						content: v.string(),
						language: v.optional(v.string()),
					})
				),
				attachments: v.optional(
					v.array(
						v.object({
							name: v.string(),
							contentType: v.string(),
							storageId: v.id("_storage"),
						})
					)
				),
			})
		),
		suites: v.optional(
			v.array(
				v.object({
					name: v.string(),
					file: v.string(),
					status: v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped")),
					duration: v.number(),
					totalTests: v.number(),
					passedTests: v.number(),
					failedTests: v.number(),
					skippedTests: v.number(),
				})
			)
		),
		coverage: v.optional(
			v.object({
				summary: v.optional(
					v.object({
						lines: v.optional(v.object({ total: v.number(), covered: v.number() })),
						statements: v.optional(v.object({ total: v.number(), covered: v.number() })),
						branches: v.optional(v.object({ total: v.number(), covered: v.number() })),
						functions: v.optional(v.object({ total: v.number(), covered: v.number() })),
					})
				),
				files: v.optional(
					v.record(
						v.string(),
						v.object({
							linesCovered: v.number(),
							linesTotal: v.number(),
							lineDetails: v.optional(v.string()),
							statementsCovered: v.optional(v.number()),
							statementsTotal: v.optional(v.number()),
							branchesCovered: v.optional(v.number()),
							branchesTotal: v.optional(v.number()),
							functionsCovered: v.optional(v.number()),
							functionsTotal: v.optional(v.number()),
						})
					)
				),
			})
		),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		// Get or create project
		let projectId = args.projectId;
		let projectCreated = false;
		if (!projectId) {
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), args.projectName))
				.first();

			if (existingProject) {
				projectId = existingProject._id;
				await ctx.db.patch(projectId, {
					updatedAt: Date.now(),
				});
			} else {
				projectId = await ctx.db.insert("projects", {
					name: args.projectName,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				projectCreated = true;
			}
		}

		// Determine status based on test results
		const status =
			args.failedTests > 0
				? "failed"
				: args.skippedTests === args.totalTests
					? "skipped"
					: "passed";

		// Create test run
		const testRunId = await ctx.db.insert("testRuns", {
			projectId,
			framework: args.framework,
			testType: args.testType,
			status,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			duration: args.duration,
			totalTests: args.totalTests,
			passedTests: args.passedTests,
			failedTests: args.failedTests,
			skippedTests: args.skippedTests,
			environment: args.environment,
			ci: args.ci,
			commitSha: args.commitSha,
			triggeredBy: args.triggeredBy,
			reporterVersion: args.reporterVersion,
			metadata: args.metadata,
		});

		// Aggregates temporarily disabled - will re-enable once components are working
		// const testRunDoc = await ctx.db.get(testRunId);
		// if (testRunDoc) {
		// 	await testPyramidTotalAggregate.insert(ctx, testRunDoc);
		// 	await testPyramidPassedAggregate.insert(ctx, testRunDoc);
		// 	await testPyramidFailedAggregate.insert(ctx, testRunDoc);
		// }

		// Insert test suites
		if (args.suites) {
			for (const suite of args.suites) {
				await ctx.db.insert("testSuites", {
					testRunId,
					projectId,
					name: suite.name,
					file: suite.file,
					status: suite.status,
					duration: suite.duration,
					totalTests: suite.totalTests,
					passedTests: suite.passedTests,
					failedTests: suite.failedTests,
					skippedTests: suite.skippedTests,
				});
			}
		}

		// Insert individual tests
		const now = Date.now();
		for (const test of args.tests) {
			const testId = await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: test.name,
				file: test.file,
				line: test.line,
				column: test.column,
				status: test.status,
				duration: test.duration,
				error: test.error,
				errorDetails: test.errorDetails,
				retries: test.retries,
				suite: test.suite,
				tags: test.tags,
				metadata: test.metadata,
				stdout: test.stdout,
				stderr: test.stderr,
			});

			if (test.codeSnippet) {
				await ctx.db.insert("codeSnippets", {
					testId,
					file: test.file,
					startLine: test.codeSnippet.startLine,
					endLine: test.codeSnippet.endLine,
					content: test.codeSnippet.content,
					language: test.codeSnippet.language,
					fetchedAt: now,
				});
			}

			if (test.attachments) {
				for (const att of test.attachments) {
					await ctx.db.insert("testAttachments", {
						testId,
						name: att.name,
						contentType: att.contentType,
						storageId: att.storageId,
						createdAt: now,
					});
				}
			}
		}

		// Insert file coverage when provided
		if (args.coverage?.files && Object.keys(args.coverage.files).length > 0) {
			for (const [file, fileCov] of Object.entries(args.coverage.files)) {
				await ctx.db.insert("fileCoverage", {
					testRunId,
					projectId,
					file,
					linesCovered: fileCov.linesCovered,
					linesTotal: fileCov.linesTotal,
					lineDetails: fileCov.lineDetails,
					statementsCovered: fileCov.statementsCovered,
					statementsTotal: fileCov.statementsTotal,
					branchesCovered: fileCov.branchesCovered,
					branchesTotal: fileCov.branchesTotal,
					functionsCovered: fileCov.functionsCovered,
					functionsTotal: fileCov.functionsTotal,
				});
			}
		}

		// Update pre-computed dashboard stats (one doc read + one patch; pyramid updated per definition)
		await updateDashboardStats(ctx, {
			projectId,
			testType: args.testType,
			startedAt: args.startedAt,
			tests: args.tests,
			projectCreated,
		});

		return { testRunId, projectId };
	},
});

const COVERAGE_PER_RUN_LIMIT = 2000;

export const getCoverageForTestRun = query({
	args: {
		testRunId: v.id("testRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("fileCoverage")
			.withIndex("by_test_run", (q) => q.eq("testRunId", args.testRunId))
			.take(COVERAGE_PER_RUN_LIMIT);
	},
});

export const getTestRuns = query({
	args: {
		projectId: v.optional(v.id("projects")),
		testType: v.optional(
			v.union(v.literal("unit"), v.literal("integration"), v.literal("e2e"), v.literal("visual"))
		),
		ci: v.optional(v.boolean()),
		triggeredBy: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		let runs: Doc<"testRuns">[];
		if (args.projectId !== undefined) {
			const projectId = args.projectId;
			runs = await ctx.db
				.query("testRuns")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.order("desc")
				.take(args.limit ?? 100);
		} else {
			runs = await ctx.db
				.query("testRuns")
				.withIndex("by_started_at")
				.order("desc")
				.take(args.limit ?? 100);
		}
		let filtered = runs;
		if (args.ci !== undefined) {
			filtered = filtered.filter((r) => r.ci === args.ci);
		}
		if (args.triggeredBy !== undefined && args.triggeredBy !== "") {
			filtered = filtered.filter((r) => r.triggeredBy === args.triggeredBy);
		}
		if (args.testType !== undefined) {
			filtered = filtered.filter((r) => r.testType === args.testType);
		}
		return filtered.slice(0, args.limit || 50);
	},
});

export const getTestRun = query({
	args: {
		runId: v.id("testRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.runId);
	},
});

export const getTestExecution = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.testId);
	},
});

export const getTestDefinitionExecutions = query({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		file: v.string(),
		line: v.optional(v.number()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 100;
		// Get all tests for this project
		const allTests = await ctx.db
			.query("tests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.take(1000); // Reasonable limit for filtering

		// Filter by test definition (name + file + line)
		const matchingTests = allTests.filter(
			(test) =>
				test.name === args.name &&
				test.file === args.file &&
				(test.line === args.line || (args.line === undefined && test.line === undefined))
		);

		// Sort by most recent first (by testRunId which is time-ordered)
		const sorted = matchingTests.sort((a, b) => {
			// Compare by ID which is roughly chronological
			return b._id > a._id ? 1 : -1;
		});

		// Get test runs for context
		const testRuns = await Promise.all(
			sorted.slice(0, limit).map(async (test) => {
				const run = await ctx.db.get(test.testRunId);
				return { ...test, ci: run?.ci, commitSha: run?.commitSha, runStartedAt: run?.startedAt };
			})
		);

		return testRuns;
	},
});

const ATTACHMENTS_PER_TEST_LIMIT = 100;

export const getTestAttachments = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testAttachments")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.take(ATTACHMENTS_PER_TEST_LIMIT);
	},
});

export const getTestAttachmentsWithUrls = action({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args): Promise<Array<Doc<"testAttachments"> & { url: string | null }>> => {
		const attachments: Doc<"testAttachments">[] = await ctx.runQuery(api.tests.getTestAttachments, {
			testId: args.testId,
		});
		const withUrls = await Promise.all(
			attachments.map(async (att: Doc<"testAttachments">) => {
				const url = await ctx.storage.getUrl(att.storageId);
				return { ...att, url };
			})
		);
		return withUrls;
	},
});

export const getTests = query({
	args: {
		testRunId: v.optional(v.id("testRuns")),
		projectId: v.optional(v.id("projects")),
		status: v.optional(
			v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped"), v.literal("running"))
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const defaultLimit = 1000;
		const limit = args.limit ?? defaultLimit;
		const testRunId = args.testRunId;
		const projectId = args.projectId;
		const status = args.status;

		if (testRunId !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunId))
				.take(limit);
		}
		if (projectId !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.take(limit);
		}
		if (status !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", status))
				.take(limit);
		}
		return await ctx.db.query("tests").take(limit);
	},
});

const SEARCH_TAKE_LIMIT = 500; // Max docs per search index to stay under read limit when merging two searches

export const getTestsPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		testRunId: v.optional(v.id("testRuns")),
		projectId: v.optional(v.id("projects")),
		status: v.optional(
			v.union(
				v.literal("passed"),
				v.literal("failed"),
				v.literal("skipped"),
				v.literal("running"),
				v.literal("all")
			)
		),
		searchQuery: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const hasSearchQuery = args.searchQuery && args.searchQuery.trim() !== "";
		const effectiveStatus = args.status === "all" ? undefined : args.status;

		// Search path: capped read then manual cursor slice (cannot use DB-level pagination for merged search)
		if (hasSearchQuery && args.searchQuery) {
			const searchTerm = args.searchQuery.trim();

			const nameResults = await ctx.db
				.query("tests")
				.withSearchIndex("search_name", (q) => {
					const baseQuery = q.search("name", searchTerm);
					if (args.projectId && effectiveStatus) {
						return baseQuery.eq("projectId", args.projectId).eq("status", effectiveStatus);
					}
					if (args.projectId) {
						return baseQuery.eq("projectId", args.projectId);
					}
					if (effectiveStatus) {
						return baseQuery.eq("status", effectiveStatus);
					}
					return baseQuery;
				})
				.take(SEARCH_TAKE_LIMIT);

			const fileResults = await ctx.db
				.query("tests")
				.withSearchIndex("search_file", (q) => {
					const baseQuery = q.search("file", searchTerm);
					if (args.projectId && effectiveStatus) {
						return baseQuery.eq("projectId", args.projectId).eq("status", effectiveStatus);
					}
					if (args.projectId) {
						return baseQuery.eq("projectId", args.projectId);
					}
					if (effectiveStatus) {
						return baseQuery.eq("status", effectiveStatus);
					}
					return baseQuery;
				})
				.take(SEARCH_TAKE_LIMIT);

			const seenIds = new Set<Id<"tests">>();
			const allTests: Doc<"tests">[] = [];
			for (const test of nameResults) {
				if (!seenIds.has(test._id)) {
					seenIds.add(test._id);
					allTests.push(test);
				}
			}
			for (const test of fileResults) {
				if (!seenIds.has(test._id)) {
					seenIds.add(test._id);
					allTests.push(test);
				}
			}

			const filterTestRunId = args.testRunId;
			if (filterTestRunId) {
				allTests.splice(
					0,
					allTests.length,
					...allTests.filter((t) => t.testRunId === filterTestRunId)
				);
			}

			allTests.sort((a, b) => (b._id > a._id ? 1 : -1));

			const { numItems, cursor } = args.paginationOpts;
			const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
			const endIndex = startIndex + numItems;
			const slice = allTests.slice(startIndex, endIndex);
			const page = await Promise.all(
				slice.map(async (test) => {
					const run = await ctx.db.get(test.testRunId);
					return { ...test, ci: run?.ci, commitSha: run?.commitSha };
				})
			);
			return {
				page,
				continueCursor: endIndex >= allTests.length ? "" : endIndex.toString(),
				isDone: endIndex >= allTests.length,
			};
		}

		// Indexed paths: use DB-level pagination to avoid reading more than numItems (+ run lookups)
		const testRunIdPag = args.testRunId;
		const projectIdPag = args.projectId;
		let paginated: { page: Doc<"tests">[]; continueCursor: string; isDone: boolean };

		if (testRunIdPag !== undefined) {
			const q = ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunIdPag))
				.order("desc");
			const result = await q.paginate(args.paginationOpts);
			const filtered = effectiveStatus
				? result.page.filter((t) => t.status === effectiveStatus)
				: result.page;
			paginated = {
				page: filtered,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (projectIdPag !== undefined && effectiveStatus) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_project_and_status", (q) =>
					q.eq("projectId", projectIdPag).eq("status", effectiveStatus)
				)
				.order("desc")
				.paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (projectIdPag !== undefined) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectIdPag))
				.order("desc")
				.paginate(args.paginationOpts);
			const filtered = effectiveStatus
				? result.page.filter((t) => t.status === effectiveStatus)
				: result.page;
			paginated = {
				page: filtered,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (effectiveStatus) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", effectiveStatus))
				.order("desc")
				.paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else {
			const result = await ctx.db.query("tests").order("desc").paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		}

		const page = await Promise.all(
			paginated.page.map(async (test) => {
				const run = await ctx.db.get(test.testRunId);
				return { ...test, ci: run?.ci, commitSha: run?.commitSha };
			})
		);
		return {
			page,
			continueCursor: paginated.continueCursor,
			isDone: paginated.isDone,
		};
	},
});

const PROJECTS_LIMIT = 500;

export const getProjects = query({
	handler: async (ctx) => {
		return await ctx.db.query("projects").order("desc").take(PROJECTS_LIMIT);
	},
});

/** Pre-computed overview for dashboard (one doc read). Use this instead of loading all projects/pyramid for overview cards. */
export const getDashboardStats = query({
	handler: async (ctx) => {
		const doc = await ctx.db.query("dashboardStats").first();
		if (!doc) {
			return {
				projectCount: 0,
				testRunCount: 0,
				pyramid: ZERO_PYRAMID,
			};
		}
		return {
			projectCount: doc.projectCount,
			testRunCount: doc.testRunCount,
			pyramid: doc.pyramid,
		};
	},
});

export const updateProjectRepository = mutation({
	args: {
		projectId: v.id("projects"),
		repository: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.projectId, {
			repository: args.repository,
			updatedAt: Date.now(),
		});
		return { success: true };
	},
});

function testDefinitionKey(
	projectId: Id<"projects">,
	name: string,
	file: string,
	line: number | undefined
): string {
	return `${projectId}|${name}|${file}|${line ?? ""}`;
}

const ZERO_PYRAMID = {
	unit: { total: 0, passed: 0, failed: 0 },
	integration: { total: 0, passed: 0, failed: 0 },
	e2e: { total: 0, passed: 0, failed: 0 },
	visual: { total: 0, passed: 0, failed: 0 },
};

type PyramidType = keyof typeof ZERO_PYRAMID;
type TestStatus = "passed" | "failed" | "skipped" | "running";

async function updateDashboardStats(
	ctx: GenericMutationCtx<DataModel>,
	args: {
		projectId: Id<"projects">;
		testType: "unit" | "integration" | "e2e" | "visual";
		startedAt: number;
		tests: Array<{ name: string; file: string; line?: number; status: TestStatus }>;
		projectCreated: boolean;
	}
) {
	const now = Date.now();
	let statsDoc = await ctx.db.query("dashboardStats").first();
	if (!statsDoc) {
		const id = await ctx.db.insert("dashboardStats", {
			projectCount: 0,
			testRunCount: 0,
			pyramid: { ...ZERO_PYRAMID },
			updatedAt: now,
		});
		const created = await ctx.db.get(id);
		if (!created) throw new Error("Failed to create dashboardStats");
		statsDoc = created;
	}

	const pyramid = {
		unit: { ...statsDoc.pyramid.unit },
		integration: { ...statsDoc.pyramid.integration },
		e2e: { ...statsDoc.pyramid.e2e },
		visual: { ...statsDoc.pyramid.visual },
	};

	const projectCount = statsDoc.projectCount + (args.projectCreated ? 1 : 0);
	const testRunCount = statsDoc.testRunCount + 1;
	const typeKey = args.testType as PyramidType;

	for (const test of args.tests) {
		const definitionKey = testDefinitionKey(args.projectId, test.name, test.file, test.line);
		const existing = await ctx.db
			.query("testDefinitionLatest")
			.withIndex("by_project_type_key", (q) =>
				q
					.eq("projectId", args.projectId)
					.eq("testType", args.testType)
					.eq("definitionKey", definitionKey)
			)
			.first();

		if (!existing) {
			await ctx.db.insert("testDefinitionLatest", {
				projectId: args.projectId,
				testType: args.testType,
				definitionKey,
				status: test.status,
				lastRunStartedAt: args.startedAt,
			});
			pyramid[typeKey].total += 1;
			if (test.status === "passed") pyramid[typeKey].passed += 1;
			else if (test.status === "failed") pyramid[typeKey].failed += 1;
		} else if (args.startedAt >= existing.lastRunStartedAt) {
			if (existing.status === "passed") pyramid[typeKey].passed -= 1;
			else if (existing.status === "failed") pyramid[typeKey].failed -= 1;
			await ctx.db.patch("testDefinitionLatest", existing._id, {
				status: test.status,
				lastRunStartedAt: args.startedAt,
			});
			if (test.status === "passed") pyramid[typeKey].passed += 1;
			else if (test.status === "failed") pyramid[typeKey].failed += 1;
		}
	}

	await ctx.db.patch("dashboardStats", statsDoc._id, {
		projectCount,
		testRunCount,
		pyramid,
		updatedAt: now,
	});
}

const PYRAMID_RUNS_LIMIT = 50; // Max runs to consider (newest first)
const PYRAMID_TESTS_PER_RUN_LIMIT = 500; // Max tests read per run; keeps total reads under 32k

export const getTestPyramidData = query({
	args: {
		projectId: v.optional(v.id("projects")),
	},
	handler: async (ctx, args) => {
		// Count unique test definitions per type; passed/failed from latest execution per definition.
		// Capped to stay under Convex read limit (~32k). See docs/TERMINOLOGY.md.
		const pyramidProjectId = args.projectId;
		const runsUnsorted = pyramidProjectId
			? await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", pyramidProjectId))
					.take(500)
			: await ctx.db.query("testRuns").withIndex("by_started_at").order("desc").take(500);
		const testRuns = runsUnsorted
			.sort((a, b) => b.startedAt - a.startedAt)
			.slice(0, PYRAMID_RUNS_LIMIT);

		const pyramid = {
			unit: { total: 0, passed: 0, failed: 0 },
			integration: { total: 0, passed: 0, failed: 0 },
			e2e: { total: 0, passed: 0, failed: 0 },
			visual: { total: 0, passed: 0, failed: 0 },
		};

		const seenByType: Record<
			keyof typeof pyramid,
			Map<string, "passed" | "failed" | "skipped" | "running">
		> = {
			unit: new Map(),
			integration: new Map(),
			e2e: new Map(),
			visual: new Map(),
		};

		for (const run of testRuns) {
			const type = run.testType;
			if (!(type in seenByType)) continue;
			const map = seenByType[type as keyof typeof seenByType];
			const tests = await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", run._id))
				.take(PYRAMID_TESTS_PER_RUN_LIMIT);
			for (const test of tests) {
				const key = testDefinitionKey(test.projectId, test.name, test.file, test.line);
				if (!map.has(key)) {
					map.set(key, test.status);
				}
			}
		}

		for (const type of ["unit", "integration", "e2e", "visual"] as const) {
			const map = seenByType[type];
			pyramid[type].total = map.size;
			for (const status of map.values()) {
				if (status === "passed") pyramid[type].passed += 1;
				else if (status === "failed") pyramid[type].failed += 1;
			}
		}

		return pyramid;
	},
});

// Seed mutation to insert a sample failing test for demonstration
export const seedFailingTest = mutation({
	args: {},
	handler: async (ctx) => {
		try {
			const now = Date.now();
			console.log("Starting seed mutation...");

			// Get or create a demo project
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), "panoptes"))
				.first();

			let projectId: Id<"projects">;
			if (!existingProject) {
				console.log("Creating new project...");
				projectId = await ctx.db.insert("projects", {
					name: "panoptes",
					description: "Panoptes test visualization platform",
					createdAt: now,
					updatedAt: now,
				});
			} else {
				console.log("Updating existing project...");
				await ctx.db.patch(existingProject._id, {
					updatedAt: now,
				});
				projectId = existingProject._id;
			}

			console.log("Project ID:", projectId);

			// Create a test run with a failing test
			console.log("Creating test run...");
			const testRunId = await ctx.db.insert("testRuns", {
				projectId,
				framework: "vitest",
				testType: "unit",
				status: "failed",
				startedAt: now - 5000,
				completedAt: now,
				duration: 5000,
				totalTests: 3,
				passedTests: 2,
				failedTests: 1,
				skippedTests: 0,
				environment: "local",
				ci: false,
			});

			console.log("Test run ID:", testRunId);

			// Aggregates temporarily disabled - will re-enable once components are working
			// const testRunDoc = await ctx.db.get(testRunId);
			// if (testRunDoc) {
			// 	console.log("Updating aggregates...");
			// 	try {
			// 		await testPyramidTotalAggregate.insert(ctx, testRunDoc);
			// 		await testPyramidPassedAggregate.insert(ctx, testRunDoc);
			// 		await testPyramidFailedAggregate.insert(ctx, testRunDoc);
			// 	} catch (aggregateError) {
			// 		console.error("Error updating aggregates:", aggregateError);
			// 		// Continue even if aggregates fail
			// 	}
			// }

			// Insert the failing test
			console.log("Inserting failing test...");
			const failingTestId = await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should calculate total correctly",
				file: "convex/tests.ts",
				line: 42,
				column: 5,
				status: "failed",
				duration: 150,
				error: "AssertionError: expected 5 to equal 6",
				errorDetails: "Expected: 6\nReceived: 5\n\nat Object.<anonymous> (convex/tests.ts:42:15)",
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			console.log("Failing test ID:", failingTestId);

			// Insert passing tests
			console.log("Inserting passing tests...");
			await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should add two numbers",
				file: "convex/tests.ts",
				line: 10,
				status: "passed",
				duration: 50,
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should subtract two numbers",
				file: "convex/tests.ts",
				line: 20,
				status: "passed",
				duration: 45,
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			console.log("Seed mutation completed successfully");
			return { testRunId, projectId, failingTestId };
		} catch (error) {
			console.error("Error in seedFailingTest mutation:", error);
			throw error;
		}
	},
});
