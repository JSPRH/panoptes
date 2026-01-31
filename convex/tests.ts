import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
		const runs = args.projectId
			? await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
					.order("desc")
					.take(args.limit || 50)
			: await ctx.db
					.query("testRuns")
					.withIndex("by_started_at")
					.order("desc")
					.take(args.limit || 50);

		return runs;
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
		let tests;
		if (args.testRunId) {
			tests = await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", args.testRunId!))
				.take(args.limit || 100);
		} else if (args.projectId) {
			tests = await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
				.take(args.limit || 100);
		} else if (args.status) {
			tests = await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", args.status!))
				.take(args.limit || 100);
		} else {
			tests = await ctx.db.query("tests").take(args.limit || 100);
		}
		return tests;
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
		const query = args.projectId
			? ctx.db.query("testRuns").withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
			: ctx.db.query("testRuns");

		const runs = await query.collect();

		const pyramid = {
			unit: { total: 0, passed: 0, failed: 0 },
			integration: { total: 0, passed: 0, failed: 0 },
			e2e: { total: 0, passed: 0, failed: 0 },
			visual: { total: 0, passed: 0, failed: 0 },
		};

		for (const run of runs) {
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
