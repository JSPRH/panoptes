import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getTestFailureAnalysis = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testFailureAnalysis")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();
	},
});

export const _createTestFailureAnalysis = mutation({
	args: {
		testId: v.id("tests"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
	},
	handler: async (ctx, args) => {
		// Check if analysis already exists
		const existing = await ctx.db
			.query("testFailureAnalysis")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();

		if (existing) {
			// If existing is "failed" and we're creating a "pending" one, update it to pending
			if (existing.status === "failed" && args.status === "pending") {
				await ctx.db.patch(existing._id, {
					status: "pending",
					createdAt: Date.now(),
				});
				return existing._id;
			}
			return existing._id;
		}

		return await ctx.db.insert("testFailureAnalysis", {
			testId: args.testId,
			status: args.status,
			createdAt: Date.now(),
		});
	},
});

export const _updateTestFailureAnalysis = mutation({
	args: {
		analysisId: v.id("testFailureAnalysis"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
		summary: v.optional(v.string()),
		rootCause: v.optional(v.string()),
		suggestedFix: v.optional(v.string()),
		codeLocation: v.optional(v.string()),
		confidence: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
		relatedFiles: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const { analysisId, ...updateData } = args;
		await ctx.db.patch(analysisId, {
			...updateData,
			updatedAt: Date.now(),
		});
	},
});
