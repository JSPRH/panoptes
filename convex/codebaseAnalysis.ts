import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// =============================================================================
// Internal Queries and Mutations for Codebase Analysis
// These must be in a separate file without "use node" directive
// =============================================================================

export const _getLatestAnalysis = internalQuery({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("codebaseAnalysis")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.order("desc")
			.first();
	},
});

export const _createAnalysis = internalMutation({
	args: {
		projectId: v.id("projects"),
		status: v.union(
			v.literal("pending"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed")
		),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("codebaseAnalysis", {
			projectId: args.projectId,
			status: args.status,
			startedAt: Date.now(),
			model: args.model,
		});
	},
});

export const _updateAnalysis = internalMutation({
	args: {
		analysisId: v.id("codebaseAnalysis"),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("running"),
				v.literal("completed"),
				v.literal("failed")
			)
		),
		progress: v.optional(
			v.object({
				phase: v.string(),
				current: v.number(),
				total: v.number(),
			})
		),
		filesScanned: v.optional(v.number()),
		featuresDiscovered: v.optional(v.number()),
		testsMapped: v.optional(v.number()),
		error: v.optional(v.string()),
		completedAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { analysisId, ...updates } = args;
		const cleanUpdates: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				cleanUpdates[key] = value;
			}
		}
		await ctx.db.patch(analysisId, cleanUpdates);
	},
});

export const _createFeature = internalMutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.string(),
		category: v.optional(v.string()),
		userJourney: v.optional(v.string()),
		relatedFiles: v.array(v.string()),
		confidence: v.number(),
		isUserDefined: v.boolean(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("features", {
			...args,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const _createTestFeatureMapping = internalMutation({
	args: {
		projectId: v.id("projects"),
		testDefinitionKey: v.string(),
		featureId: v.id("features"),
		confidence: v.number(),
		reason: v.string(),
		isUserConfirmed: v.boolean(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("testFeatureMappings", {
			...args,
			createdAt: Date.now(),
		});
	},
});

export const _getProjectFeatures = internalQuery({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.collect();
	},
});

export const _getTestDefinitions = internalQuery({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testDefinitionLatest")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();
	},
});

export const _getFileCoverageForProject = internalQuery({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("fileCoverage")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();
	},
});

export const _clearProjectFeatures = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		// Archive existing features instead of deleting
		const features = await ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.collect();

		for (const feature of features) {
			await ctx.db.patch(feature._id, { status: "archived", updatedAt: Date.now() });
		}

		// Delete existing mappings for this project
		const mappings = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();

		for (const mapping of mappings) {
			await ctx.db.delete(mapping._id);
		}
	},
});
