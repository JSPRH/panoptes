// Aggregates temporarily disabled to unblock - will re-enable once components are working
// import { TableAggregate } from "@convex-dev/aggregate";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
// import { components } from "./_generated/api";
import { api } from "./_generated/api";
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
		if (!projectId) {
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), args.projectName))
				.first();

			if (existingProject) {
				projectId = existingProject._id;
				// Update project
				await ctx.db.patch(projectId, {
					updatedAt: Date.now(),
				});
			} else {
				projectId = await ctx.db.insert("projects", {
					name: args.projectName,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
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

		return { testRunId, projectId };
	},
});

export const getCoverageForTestRun = query({
	args: {
		testRunId: v.id("testRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("fileCoverage")
			.withIndex("by_test_run", (q) => q.eq("testRunId", args.testRunId))
			.collect();
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

export const getTestAttachments = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testAttachments")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.collect();
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
		if (args.testRunId !== undefined) {
			const testRunId = args.testRunId;
			const query = ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunId));
			return args.limit ? await query.take(args.limit) : await query.collect();
		}
		if (args.projectId !== undefined) {
			const projectId = args.projectId;
			const query = ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectId));
			return args.limit ? await query.take(args.limit) : await query.collect();
		}
		if (args.status !== undefined) {
			const status = args.status;
			const query = ctx.db.query("tests").withIndex("by_status", (q) => q.eq("status", status));
			return args.limit ? await query.take(args.limit) : await query.collect();
		}
		const query = ctx.db.query("tests");
		return args.limit ? await query.take(args.limit) : await query.collect();
	},
});

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
		// Use type inference from the query results
		// biome-ignore lint/suspicious/noImplicitAnyLet: Type inferred from query results
		let allTests;

		const hasSearchQuery = args.searchQuery && args.searchQuery.trim() !== "";
		const effectiveStatus = args.status === "all" ? undefined : args.status;

		// Priority 1: If search query is provided, use search indexes
		if (hasSearchQuery && args.searchQuery) {
			const searchTerm = args.searchQuery.trim();

			// Search by name
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
				.collect();

			// Search by file
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
				.collect();

			// Combine results (union of both searches) - deduplicate by _id
			const seenIds = new Set<Id<"tests">>();
			allTests = [];
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

			// Apply additional filters that weren't handled by search index
			if (args.testRunId) {
				allTests = allTests.filter((test) => test.testRunId === args.testRunId);
			}
		} else if (args.testRunId !== undefined) {
			// Priority 2: Filter by testRunId (most specific)
			const testRunId = args.testRunId;
			const query = ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunId));

			allTests = await query.collect();

			// Apply status filter if needed
			if (effectiveStatus) {
				allTests = allTests.filter((test) => test.status === effectiveStatus);
			}
		} else if (args.projectId !== undefined && effectiveStatus) {
			// Priority 3: Use composite index for project + status
			const projectId = args.projectId;
			allTests = await ctx.db
				.query("tests")
				.withIndex("by_project_and_status", (q) =>
					q.eq("projectId", projectId).eq("status", effectiveStatus)
				)
				.collect();
		} else if (args.projectId !== undefined) {
			// Priority 4: Filter by projectId
			const projectId = args.projectId;
			allTests = await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.collect();

			// Apply status filter if needed
			if (effectiveStatus) {
				allTests = allTests.filter((test) => test.status === effectiveStatus);
			}
		} else if (effectiveStatus) {
			// Priority 5: Filter by status only
			allTests = await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", effectiveStatus))
				.collect();
		} else {
			// Priority 6: Get all tests
			allTests = await ctx.db.query("tests").collect();
		}

		// Sort by _id descending for consistent ordering
		allTests.sort((a, b) => (b._id > a._id ? 1 : -1));

		// Manual pagination since we've filtered in memory
		const { numItems, cursor } = args.paginationOpts;
		const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
		const endIndex = startIndex + numItems;
		const slice = allTests.slice(startIndex, endIndex);
		// Attach test run's ci and commitSha so UI can show GitHub links only for CI runs
		const page = await Promise.all(
			slice.map(async (test) => {
				const run = await ctx.db.get(test.testRunId);
				return {
					...test,
					ci: run?.ci,
					commitSha: run?.commitSha,
				};
			})
		);
		const isDone = endIndex >= allTests.length;
		// Convex expects continueCursor to be a string, use empty string when done
		const nextCursor = isDone ? "" : endIndex.toString();

		return {
			page,
			continueCursor: nextCursor,
			isDone,
		};
	},
});

export const getProjects = query({
	handler: async (ctx) => {
		return await ctx.db.query("projects").order("desc").collect();
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

export const getTestPyramidData = query({
	args: {
		projectId: v.optional(v.id("projects")),
	},
	handler: async (ctx, args) => {
		// Count unique test definitions per type; passed/failed from latest execution per definition.
		// See docs/TERMINOLOGY.md: test = definition, tests table = test executions.
		const projectId = args.projectId;
		const runsUnsorted = projectId
			? await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", projectId))
					.collect()
			: await ctx.db.query("testRuns").collect();
		const testRuns = runsUnsorted.sort((a, b) => b.startedAt - a.startedAt);

		const pyramid = {
			unit: { total: 0, passed: 0, failed: 0 },
			integration: { total: 0, passed: 0, failed: 0 },
			e2e: { total: 0, passed: 0, failed: 0 },
			visual: { total: 0, passed: 0, failed: 0 },
		};

		// Per type: map of definition key -> latest status (we process runs newest-first)
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
				.collect();
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
