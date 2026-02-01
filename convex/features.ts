import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// =============================================================================
// Feature Queries
// =============================================================================

/**
 * Get all active features for a project with test counts.
 */
export const getFeatures = query({
	args: {
		projectId: v.id("projects"),
		category: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const featuresQuery = ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"));

		const features = await featuresQuery.collect();

		// Filter by category if specified
		const filteredFeatures = args.category
			? features.filter((f) => f.category === args.category)
			: features;

		// Get test counts for each feature
		const featuresWithCounts = await Promise.all(
			filteredFeatures.map(async (feature) => {
				const mappings = await ctx.db
					.query("testFeatureMappings")
					.withIndex("by_feature", (q) => q.eq("featureId", feature._id))
					.collect();

				const confirmedCount = mappings.filter((m) => m.isUserConfirmed).length;
				const totalCount = mappings.length;
				const avgConfidence =
					mappings.length > 0
						? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
						: 0;

				return {
					...feature,
					testCount: totalCount,
					confirmedTestCount: confirmedCount,
					avgConfidence,
				};
			})
		);

		// Sort by test count (features with more tests first)
		return featuresWithCounts.sort((a, b) => b.testCount - a.testCount);
	},
});

/**
 * Get all unique categories for a project.
 */
export const getCategories = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const features = await ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.collect();

		const categories = new Set<string>();
		for (const feature of features) {
			if (feature.category) {
				categories.add(feature.category);
			}
		}

		return Array.from(categories).sort();
	},
});

/**
 * Get a single feature with its mapped tests.
 */
export const getFeatureWithTests = query({
	args: { featureId: v.id("features") },
	handler: async (ctx, args) => {
		const feature = await ctx.db.get(args.featureId);
		if (!feature) return null;

		const mappings = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_feature", (q) => q.eq("featureId", args.featureId))
			.collect();

		// Get test details for each mapping
		const testsWithMappings = await Promise.all(
			mappings.map(async (mapping) => {
				// Parse definitionKey to extract test info
				const parts = mapping.testDefinitionKey.split("|");
				const testName = parts[1] || "Unknown test";
				const testFile = parts[2] || "Unknown file";
				const testLine = parts[3] ? Number.parseInt(parts[3], 10) : undefined;

				// Try to find the actual test definition
				const testDef = await ctx.db
					.query("testDefinitionLatest")
					.withIndex("by_project", (q) => q.eq("projectId", mapping.projectId))
					.filter((q) => q.eq(q.field("definitionKey"), mapping.testDefinitionKey))
					.first();

				return {
					mapping,
					testName,
					testFile,
					testLine,
					testType: testDef?.testType,
					testStatus: testDef?.status,
				};
			})
		);

		return {
			feature,
			tests: testsWithMappings,
		};
	},
});

/**
 * Get features that have few or no test mappings (uncovered features).
 */
export const getUncoveredFeatures = query({
	args: {
		projectId: v.id("projects"),
		maxTestCount: v.optional(v.number()), // Features with <= this many tests
	},
	handler: async (ctx, args) => {
		const maxTests = args.maxTestCount ?? 0;

		const features = await ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.collect();

		const uncoveredFeatures = await Promise.all(
			features.map(async (feature) => {
				const mappings = await ctx.db
					.query("testFeatureMappings")
					.withIndex("by_feature", (q) => q.eq("featureId", feature._id))
					.collect();

				if (mappings.length <= maxTests) {
					return {
						...feature,
						testCount: mappings.length,
					};
				}
				return null;
			})
		);

		return uncoveredFeatures
			.filter((f): f is NonNullable<typeof f> => f !== null)
			.sort((a, b) => a.testCount - b.testCount);
	},
});

/**
 * Get the latest codebase analysis for a project.
 */
export const getLatestAnalysis = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("codebaseAnalysis")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.order("desc")
			.first();
	},
});

/**
 * Get test-to-feature mappings for a specific test.
 */
export const getTestFeatureMappings = query({
	args: { testDefinitionKey: v.string() },
	handler: async (ctx, args) => {
		const mappings = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_test", (q) => q.eq("testDefinitionKey", args.testDefinitionKey))
			.collect();

		// Get feature details for each mapping
		const mappingsWithFeatures = await Promise.all(
			mappings.map(async (mapping) => {
				const feature = await ctx.db.get(mapping.featureId);
				return {
					...mapping,
					feature,
				};
			})
		);

		return mappingsWithFeatures.filter((m) => m.feature && m.feature.status === "active");
	},
});

/**
 * Get feature summary stats for a project.
 */
export const getFeatureStats = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const features = await ctx.db
			.query("features")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("status"), "active"))
			.collect();

		const mappings = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();

		const categoryCounts: Record<string, number> = {};
		let uncoveredCount = 0;
		let lowCoverageCount = 0;

		for (const feature of features) {
			// Count by category
			const category = feature.category || "Uncategorized";
			categoryCounts[category] = (categoryCounts[category] || 0) + 1;

			// Check coverage
			const featureMappings = mappings.filter((m) => m.featureId === feature._id);
			if (featureMappings.length === 0) {
				uncoveredCount++;
			} else if (featureMappings.length <= 2) {
				lowCoverageCount++;
			}
		}

		return {
			totalFeatures: features.length,
			totalMappings: mappings.length,
			uncoveredCount,
			lowCoverageCount,
			categoryCounts,
			userDefinedCount: features.filter((f) => f.isUserDefined).length,
			aiDiscoveredCount: features.filter((f) => !f.isUserDefined).length,
		};
	},
});

// =============================================================================
// Feature Mutations
// =============================================================================

/**
 * Update a feature (user edits).
 */
export const updateFeature = mutation({
	args: {
		featureId: v.id("features"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		category: v.optional(v.string()),
		userJourney: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { featureId, ...updates } = args;
		const cleanUpdates: Record<string, unknown> = {
			updatedAt: Date.now(),
			isUserDefined: true, // Mark as user-edited
		};

		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				cleanUpdates[key] = value;
			}
		}

		await ctx.db.patch(featureId, cleanUpdates);
	},
});

/**
 * Archive a feature (soft delete).
 */
export const archiveFeature = mutation({
	args: { featureId: v.id("features") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.featureId, {
			status: "archived",
			updatedAt: Date.now(),
		});
	},
});

/**
 * Create a new user-defined feature.
 */
export const createFeature = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.string(),
		category: v.optional(v.string()),
		userJourney: v.optional(v.string()),
		relatedFiles: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("features", {
			projectId: args.projectId,
			name: args.name,
			description: args.description,
			category: args.category,
			userJourney: args.userJourney,
			relatedFiles: args.relatedFiles || [],
			confidence: 1.0, // User-defined features have full confidence
			isUserDefined: true,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	},
});

/**
 * Merge two features into one.
 */
export const mergeFeatures = mutation({
	args: {
		sourceFeatureId: v.id("features"),
		targetFeatureId: v.id("features"),
	},
	handler: async (ctx, args) => {
		const sourceFeature = await ctx.db.get(args.sourceFeatureId);
		const targetFeature = await ctx.db.get(args.targetFeatureId);

		if (!sourceFeature || !targetFeature) {
			throw new Error("One or both features not found");
		}

		// Move all mappings from source to target
		const sourceMappings = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_feature", (q) => q.eq("featureId", args.sourceFeatureId))
			.collect();

		for (const mapping of sourceMappings) {
			// Check if target already has this test mapped
			const existingMapping = await ctx.db
				.query("testFeatureMappings")
				.withIndex("by_feature", (q) => q.eq("featureId", args.targetFeatureId))
				.filter((q) => q.eq(q.field("testDefinitionKey"), mapping.testDefinitionKey))
				.first();

			if (existingMapping) {
				// Keep the higher confidence mapping
				if (mapping.confidence > existingMapping.confidence) {
					await ctx.db.patch(existingMapping._id, {
						confidence: mapping.confidence,
						reason: mapping.reason,
					});
				}
				await ctx.db.delete(mapping._id);
			} else {
				// Move mapping to target
				await ctx.db.patch(mapping._id, {
					featureId: args.targetFeatureId,
				});
			}
		}

		// Merge related files
		const mergedFiles = [
			...new Set([...targetFeature.relatedFiles, ...sourceFeature.relatedFiles]),
		];

		await ctx.db.patch(args.targetFeatureId, {
			relatedFiles: mergedFiles,
			isUserDefined: true,
			updatedAt: Date.now(),
		});

		// Archive the source feature
		await ctx.db.patch(args.sourceFeatureId, {
			status: "archived",
			updatedAt: Date.now(),
		});

		return args.targetFeatureId;
	},
});

/**
 * Confirm or reject a test-feature mapping.
 */
export const confirmTestMapping = mutation({
	args: {
		mappingId: v.id("testFeatureMappings"),
		confirmed: v.boolean(),
	},
	handler: async (ctx, args) => {
		if (args.confirmed) {
			await ctx.db.patch(args.mappingId, {
				isUserConfirmed: true,
			});
		} else {
			// If rejected, delete the mapping
			await ctx.db.delete(args.mappingId);
		}
	},
});

/**
 * Manually map a test to a feature.
 */
export const createTestMapping = mutation({
	args: {
		projectId: v.id("projects"),
		testDefinitionKey: v.string(),
		featureId: v.id("features"),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if mapping already exists
		const existing = await ctx.db
			.query("testFeatureMappings")
			.withIndex("by_feature", (q) => q.eq("featureId", args.featureId))
			.filter((q) => q.eq(q.field("testDefinitionKey"), args.testDefinitionKey))
			.first();

		if (existing) {
			// Update existing to be user-confirmed
			await ctx.db.patch(existing._id, {
				isUserConfirmed: true,
				confidence: 1.0,
				reason: args.reason || existing.reason,
			});
			return existing._id;
		}

		// Create new mapping
		return await ctx.db.insert("testFeatureMappings", {
			projectId: args.projectId,
			testDefinitionKey: args.testDefinitionKey,
			featureId: args.featureId,
			confidence: 1.0,
			reason: args.reason || "Manually mapped by user",
			isUserConfirmed: true,
			createdAt: Date.now(),
		});
	},
});
