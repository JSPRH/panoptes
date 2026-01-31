import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

export const _createTestSuggestions = internalMutation({
	args: {
		projectId: v.id("projects"),
		file: v.string(),
		commitSha: v.string(),
		suggestions: v.array(
			v.object({
				title: v.string(),
				description: v.string(),
				value: v.number(),
				difficulty: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
				estimatedRuntime: v.optional(v.number()),
				testType: v.union(v.literal("unit"), v.literal("integration"), v.literal("e2e")),
				uncoveredLines: v.array(v.number()),
				prompt: v.string(),
			})
		),
		model: v.string(),
	},
	handler: async (ctx, args): Promise<Id<"testSuggestions">> => {
		return await ctx.db.insert("testSuggestions", {
			projectId: args.projectId,
			file: args.file,
			commitSha: args.commitSha,
			suggestions: args.suggestions,
			generatedAt: Date.now(),
			model: args.model,
		});
	},
});
