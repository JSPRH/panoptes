// Aggregates temporarily disabled to unblock - will re-enable once components are working
// import { TableAggregate } from "@convex-dev/aggregate";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
// import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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
		for (const test of args.tests) {
			await ctx.db.insert("tests", {
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
			});
		}

		return { testRunId, projectId };
	},
});

export const getTestRuns = query({
	args: {
		projectId: v.optional(v.id("projects")),
		testType: v.optional(
			v.union(v.literal("unit"), v.literal("integration"), v.literal("e2e"), v.literal("visual"))
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		if (args.projectId !== undefined) {
			const projectId = args.projectId;
			return await ctx.db
				.query("testRuns")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.order("desc")
				.take(args.limit || 50);
		}
		return await ctx.db
			.query("testRuns")
			.withIndex("by_started_at")
			.order("desc")
			.take(args.limit || 50);
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
			v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped"), v.literal("running"))
		),
	},
	handler: async (ctx, args) => {
		if (args.testRunId !== undefined) {
			const testRunId = args.testRunId;
			return await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunId))
				.order("desc")
				.paginate(args.paginationOpts);
		}
		if (args.projectId !== undefined) {
			const projectId = args.projectId;
			return await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.order("desc")
				.paginate(args.paginationOpts);
		}
		if (args.status !== undefined) {
			const status = args.status;
			return await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", status))
				.order("desc")
				.paginate(args.paginationOpts);
		}
		// Order by _id descending for consistent pagination
		return await ctx.db.query("tests").order("desc").paginate(args.paginationOpts);
	},
});

export const getProjects = query({
	handler: async (ctx) => {
		return await ctx.db.query("projects").order("desc").collect();
	},
});

export const getTestPyramidData = query({
	args: {
		projectId: v.optional(v.id("projects")),
	},
	handler: async (ctx, args) => {
		// Temporarily simplified - query directly from testRuns instead of using aggregates
		// This unblocks us while aggregates are being set up
		const projectId = args.projectId;
		const testRuns = projectId
			? await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", projectId))
					.collect()
			: await ctx.db.query("testRuns").collect();

		const pyramid = {
			unit: { total: 0, passed: 0, failed: 0 },
			integration: { total: 0, passed: 0, failed: 0 },
			e2e: { total: 0, passed: 0, failed: 0 },
			visual: { total: 0, passed: 0, failed: 0 },
		};

		for (const run of testRuns) {
			const type = run.testType;
			if (type in pyramid) {
				pyramid[type as keyof typeof pyramid].total += run.totalTests;
				pyramid[type as keyof typeof pyramid].passed += run.passedTests;
				pyramid[type as keyof typeof pyramid].failed += run.failedTests;
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
