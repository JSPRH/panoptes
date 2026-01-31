import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const detectAnomalies = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		// Get all tests for the project
		const tests = await ctx.db
			.query("tests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();

		// Group tests by name and file
		const testGroups = new Map<string, typeof tests>();
		for (const test of tests) {
			const key = `${test.file}:${test.name}`;
			if (!testGroups.has(key)) {
				testGroups.set(key, []);
			}
			testGroups.get(key)!.push(test);
		}

		const anomalies: Array<{
			testId: string;
			testName: string;
			type: "flaky" | "slow" | "resource_intensive" | "frequently_failing";
			severity: "low" | "medium" | "high";
			details: any;
		}> = [];

		// Detect flaky tests (tests that have inconsistent pass/fail patterns)
		for (const [key, testHistory] of testGroups) {
			if (testHistory.length < 3) continue; // Need at least 3 runs

			const passCount = testHistory.filter((t) => t.status === "passed").length;
			const failCount = testHistory.filter((t) => t.status === "failed").length;
			const totalRuns = testHistory.length;

			// Flaky if it has both passes and failures
			if (passCount > 0 && failCount > 0) {
				const flakinessRate = Math.min(passCount, failCount) / totalRuns;
				if (flakinessRate > 0.2) {
					// More than 20% inconsistency
					const severity = flakinessRate > 0.5 ? "high" : flakinessRate > 0.3 ? "medium" : "low";
					anomalies.push({
						testId: testHistory[0]._id,
						testName: testHistory[0].name,
						type: "flaky",
						severity,
						details: {
							passRate: passCount / totalRuns,
							failRate: failCount / totalRuns,
							totalRuns,
						},
					});
				}
			}

			// Detect slow tests (average duration > 5 seconds)
			const avgDuration = testHistory.reduce((sum, t) => sum + t.duration, 0) / testHistory.length;
			if (avgDuration > 5000) {
				const severity = avgDuration > 10000 ? "high" : avgDuration > 7500 ? "medium" : "low";
				anomalies.push({
					testId: testHistory[0]._id,
					testName: testHistory[0].name,
					type: "slow",
					severity,
					details: {
						averageDuration: avgDuration,
						maxDuration: Math.max(...testHistory.map((t) => t.duration)),
					},
				});
			}

			// Detect frequently failing tests
			if (failCount > 0 && failCount / totalRuns > 0.5) {
				const severity =
					failCount / totalRuns > 0.8 ? "high" : failCount / totalRuns > 0.65 ? "medium" : "low";
				anomalies.push({
					testId: testHistory[0]._id,
					testName: testHistory[0].name,
					type: "frequently_failing",
					severity,
					details: {
						failureRate: failCount / totalRuns,
						totalRuns,
						recentFailures: failCount,
					},
				});
			}
		}

		// Store anomalies
		for (const anomaly of anomalies) {
			// Check if anomaly already exists
			const existing = await ctx.db
				.query("anomalies")
				.withIndex("by_test", (q) => q.eq("testId", anomaly.testId as any))
				.filter((q) => q.eq(q.field("type"), anomaly.type))
				.filter((q) => q.eq(q.field("resolved"), false))
				.first();

			if (!existing) {
				await ctx.db.insert("anomalies", {
					projectId: args.projectId,
					testId: anomaly.testId as any,
					testName: anomaly.testName,
					type: anomaly.type,
					severity: anomaly.severity,
					detectedAt: Date.now(),
					details: anomaly.details,
					resolved: false,
				});
			}
		}

		return { detected: anomalies.length };
	},
});

export const getAnomalies = query({
	args: {
		projectId: v.optional(v.id("projects")),
		type: v.optional(
			v.union(
				v.literal("flaky"),
				v.literal("slow"),
				v.literal("resource_intensive"),
				v.literal("frequently_failing")
			)
		),
		resolved: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Use the most specific index available and collect results
		let results;
		if (args.projectId) {
			results = await ctx.db
				.query("anomalies")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
				.collect();
			// Apply additional filters in memory
			if (args.type) {
				results = results.filter((a) => a.type === args.type);
			}
			if (args.resolved !== undefined) {
				results = results.filter((a) => a.resolved === args.resolved);
			}
		} else if (args.type) {
			results = await ctx.db
				.query("anomalies")
				.withIndex("by_type", (q) => q.eq("type", args.type!))
				.collect();
			// Apply additional filters in memory
			if (args.resolved !== undefined) {
				results = results.filter((a) => a.resolved === args.resolved);
			}
		} else if (args.resolved !== undefined) {
			results = await ctx.db
				.query("anomalies")
				.withIndex("by_resolved", (q) => q.eq("resolved", args.resolved!))
				.collect();
		} else {
			results = await ctx.db.query("anomalies").collect();
		}

		return results.sort((a, b) => b.detectedAt - a.detectedAt);
	},
});

export const resolveAnomaly = mutation({
	args: {
		anomalyId: v.id("anomalies"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.anomalyId, {
			resolved: true,
			resolvedAt: Date.now(),
		});
	},
});
