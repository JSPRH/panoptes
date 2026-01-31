import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const getCIRunAnalysis = query({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunAnalysis")
			.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.ciRunId))
			.first();
	},
});

export const _createCIRunAnalysis = internalMutation({
	args: {
		ciRunId: v.id("ciRuns"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
	},
	handler: async (ctx, args) => {
		// Check if analysis already exists
		const existing = await ctx.db
			.query("ciRunAnalysis")
			.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.ciRunId))
			.first();

		if (existing) {
			// If status is "pending" and we're trying to create a new pending analysis,
			// or if existing is "completed", just return the existing ID
			if (
				existing.status === "completed" ||
				(existing.status === "pending" && args.status === "pending")
			) {
				return existing._id;
			}
			// If existing is "failed" and we're creating a "pending" one, update it to pending
			if (existing.status === "failed" && args.status === "pending") {
				await ctx.db.patch(existing._id, {
					status: "pending",
					analyzedAt: Date.now(),
				});
				return existing._id;
			}
			return existing._id;
		}

		return await ctx.db.insert("ciRunAnalysis", {
			ciRunId: args.ciRunId,
			status: args.status,
			analysis: {
				summary: "",
				rootCause: "",
				proposedFix: "",
				proposedTest: "",
				isFlaky: false,
				confidence: 0,
				cursorDeeplink: undefined,
				cursorPrompt: undefined,
			},
			analyzedAt: Date.now(),
			model: "",
		});
	},
});

export const _updateCIRunAnalysis = internalMutation({
	args: {
		analysisId: v.id("ciRunAnalysis"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
		analysis: v.optional(
			v.object({
				summary: v.string(),
				rootCause: v.string(),
				proposedFix: v.string(),
				proposedTest: v.string(),
				isFlaky: v.boolean(),
				confidence: v.number(),
				cursorDeeplink: v.optional(v.string()),
				cursorPrompt: v.optional(v.string()),
			})
		),
		model: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateData: {
			status: "pending" | "completed" | "failed";
			analyzedAt: number;
			analysis?: {
				summary: string;
				rootCause: string;
				proposedFix: string;
				proposedTest: string;
				isFlaky: boolean;
				confidence: number;
				cursorDeeplink?: string;
				cursorPrompt?: string;
			};
			model?: string;
		} = {
			status: args.status,
			analyzedAt: Date.now(),
		};

		if (args.analysis) {
			updateData.analysis = args.analysis;
		}

		if (args.model) {
			updateData.model = args.model;
		}

		await ctx.db.patch(args.analysisId, updateData);
	},
});
