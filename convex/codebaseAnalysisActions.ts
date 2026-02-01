"use node";

import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { createOpenAIClient } from "./aiAnalysisUtils";

// =============================================================================
// AI Schemas for Feature Discovery
// =============================================================================

const FeatureDiscoverySchema = z.object({
	features: z.array(
		z.object({
			name: z.string().describe("Human-readable feature name (e.g., 'User Authentication')"),
			description: z.string().describe("What this feature does for users"),
			category: z.string().describe("High-level category (e.g., 'Auth', 'Dashboard', 'Testing')"),
			userJourney: z
				.string()
				.optional()
				.describe("Optional user journey this belongs to (e.g., 'Onboarding Flow')"),
			relatedFiles: z.array(z.string()).describe("File paths that implement this feature"),
			confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
		})
	),
});

const TestFeatureMappingSchema = z.object({
	mappings: z.array(
		z.object({
			testDefinitionKey: z.string().describe("The test identifier"),
			featureIndex: z.number().describe("Index of the feature in the features list"),
			confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
			reason: z.string().describe("Brief explanation of why this test covers this feature"),
		})
	),
});

// =============================================================================
// Main Analysis Actions
// =============================================================================

/**
 * Start a codebase analysis to discover features and map tests.
 * This is the main entry point that users trigger from the UI.
 */
export const startCodebaseAnalysis = action({
	args: {
		projectId: v.id("projects"),
		forceRefresh: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<{ analysisId: Id<"codebaseAnalysis">; status: string }> => {
		// Check if there's already a running analysis
		const existingAnalysis = await ctx.runQuery(
			internal.codebaseAnalysis._getLatestAnalysis,
			{
				projectId: args.projectId,
			}
		);

		if (existingAnalysis && existingAnalysis.status === "running") {
			return {
				analysisId: existingAnalysis._id,
				status: "already_running",
			};
		}

		// If not forcing refresh and we have a completed analysis, return it
		if (!args.forceRefresh && existingAnalysis && existingAnalysis.status === "completed") {
			return {
				analysisId: existingAnalysis._id,
				status: "already_completed",
			};
		}

		// Create a new analysis record
		const analysisId = await ctx.runMutation(internal.codebaseAnalysis._createAnalysis, {
			projectId: args.projectId,
			status: "pending",
			model: "gpt-5-mini",
		});

		// Schedule the analysis to run in the background
		await ctx.scheduler.runAfter(0, internal.codebaseAnalysisActions._runAnalysis, {
			analysisId,
			projectId: args.projectId,
		});

		return {
			analysisId,
			status: "started",
		};
	},
});

/**
 * Internal action that runs the actual analysis.
 * This is scheduled as a background job.
 */
export const _runAnalysis = internalAction({
	args: {
		analysisId: v.id("codebaseAnalysis"),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		try {
			// Update status to running
			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				status: "running",
				progress: { phase: "Fetching repository tree", current: 0, total: 4 },
			});

			// Clear existing features and mappings
			await ctx.runMutation(internal.codebaseAnalysis._clearProjectFeatures, {
				projectId: args.projectId,
			});

			// Phase 1: Fetch repository tree
			let repoTree: {
				sha: string;
				truncated: boolean;
				totalFiles: number;
				files: Array<{ path: string; size?: number }>;
				categorized: {
					pages: Array<{ path: string; size?: number }>;
					components: Array<{ path: string; size?: number }>;
					api: Array<{ path: string; size?: number }>;
					services: Array<{ path: string; size?: number }>;
					hooks: Array<{ path: string; size?: number }>;
					convex: Array<{ path: string; size?: number }>;
					other: Array<{ path: string; size?: number }>;
				};
			};

			try {
				repoTree = await ctx.runAction(api.github.getRepositoryTree, {
					projectId: args.projectId,
				});
			} catch (error) {
				throw new Error(
					`Failed to fetch repository tree: ${error instanceof Error ? error.message : String(error)}`
				);
			}

			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				progress: { phase: "Fetching file contents", current: 1, total: 4 },
				filesScanned: repoTree.totalFiles,
			});

			// Phase 2: Get coverage data and test definitions
			const [coverageData, testDefinitions] = await Promise.all([
				ctx.runQuery(internal.codebaseAnalysis._getFileCoverageForProject, {
					projectId: args.projectId,
				}),
				ctx.runQuery(internal.codebaseAnalysis._getTestDefinitions, {
					projectId: args.projectId,
				}),
			]) as [Doc<"fileCoverage">[], Doc<"testDefinitionLatest">[]];

			// Phase 3: Select key files to analyze (prioritize pages, API, and covered files)
			const coveredFiles = new Set<string>(coverageData.map((c: Doc<"fileCoverage">) => c.file));
			const keyFiles: string[] = [];

			// Add all pages (these define user journeys)
			for (const file of repoTree.categorized.pages) {
				if (keyFiles.length < 100) keyFiles.push(file.path);
			}

			// Add API/Convex files (these define functionality)
			for (const file of [...repoTree.categorized.api, ...repoTree.categorized.convex]) {
				if (keyFiles.length < 100 && !keyFiles.includes(file.path)) {
					keyFiles.push(file.path);
				}
			}

			// Add covered files (we know these are tested)
			for (const file of coveredFiles) {
				if (keyFiles.length < 100 && !keyFiles.includes(file)) {
					keyFiles.push(file);
				}
			}

			// Add some components and services
			for (const file of [...repoTree.categorized.components, ...repoTree.categorized.services]) {
				if (keyFiles.length < 100 && !keyFiles.includes(file.path)) {
					keyFiles.push(file.path);
				}
			}

			// Fetch content for key files (batch to avoid rate limits)
			const fileContents: Array<{ path: string; content: string }> = [];
			const MAX_FILES_TO_FETCH = 50; // Limit for token budget
			const filesToFetch = keyFiles.slice(0, MAX_FILES_TO_FETCH);

			for (const filePath of filesToFetch) {
				try {
					const result = await ctx.runAction(api.github.getFileContent, {
						projectId: args.projectId,
						file: filePath,
					});
					// Truncate large files
					const maxContent = 5000;
					const content =
						result.content.length > maxContent
							? `${result.content.substring(0, maxContent)}\n... (truncated)`
							: result.content;
					fileContents.push({ path: filePath, content });
				} catch {
					// Skip files that can't be fetched
					console.warn(`Could not fetch file: ${filePath}`);
				}

				// Small delay to avoid rate limits
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				progress: { phase: "Discovering features with AI", current: 2, total: 4 },
			});

			// Phase 4: AI Feature Discovery
			const fileTreeSummary = Object.entries(repoTree.categorized)
				.map(([category, files]) => `${category}: ${files.map((f) => f.path).join(", ")}`)
				.join("\n");

			const fileContentsSummary = fileContents
				.map((f) => `=== ${f.path} ===\n${f.content}`)
				.join("\n\n");

			const featureDiscoveryPrompt = `Analyze this codebase to identify user-facing features and user journeys.

## Repository File Structure (by category)
${fileTreeSummary}

## Key File Contents
${fileContentsSummary}

## Instructions
Identify all distinct user-facing features in this codebase. For each feature:
1. Name: Clear, human-readable name (e.g., "User Authentication", "Test Dashboard", "CI Run Analysis")
2. Description: What this feature does for users
3. Category: High-level category (e.g., "Authentication", "Testing", "Analytics", "CI/CD", "Navigation")
4. User Journey: Optional - which user flow this belongs to (e.g., "Onboarding", "Test Analysis Flow")
5. Related Files: Files that implement this feature
6. Confidence: How confident you are (0-1)

Focus on user-facing functionality, not internal implementation details.
Look for: pages, API endpoints, UI components, data flows, user interactions.`;

			const openai = createOpenAIClient();
			let discoveredFeatures: z.infer<typeof FeatureDiscoverySchema>;

			try {
				const { object } = await generateObject({
					model: openai("gpt-5-mini"),
					schema: FeatureDiscoverySchema,
					prompt: featureDiscoveryPrompt,
					system:
						"You are an expert software architect analyzing a codebase to identify user-facing features and user journeys. Be thorough but precise - identify distinct features that users would recognize.",
					temperature: 0.3,
				});
				discoveredFeatures = object;
			} catch (error) {
				throw new Error(
					`AI feature discovery failed: ${error instanceof Error ? error.message : String(error)}`
				);
			}

			// Store discovered features
			const featureIds: Id<"features">[] = [];
			for (const feature of discoveredFeatures.features) {
				const featureId = await ctx.runMutation(internal.codebaseAnalysis._createFeature, {
					projectId: args.projectId,
					name: feature.name,
					description: feature.description,
					category: feature.category,
					userJourney: feature.userJourney,
					relatedFiles: feature.relatedFiles,
					confidence: feature.confidence,
					isUserDefined: false,
				});
				featureIds.push(featureId);
			}

			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				progress: { phase: "Mapping tests to features", current: 3, total: 4 },
				featuresDiscovered: discoveredFeatures.features.length,
			});

			// Phase 5: Map tests to features
			if (testDefinitions.length > 0 && discoveredFeatures.features.length > 0) {
				const featuresForPrompt = discoveredFeatures.features
					.map(
						(f, i) =>
							`[${i}] ${f.name}: ${f.description} (files: ${f.relatedFiles.slice(0, 3).join(", ")})`
					)
					.join("\n");

				// Process tests in batches
				const BATCH_SIZE = 50;
				let totalMapped = 0;

				for (let i = 0; i < testDefinitions.length; i += BATCH_SIZE) {
					const batch = testDefinitions.slice(i, i + BATCH_SIZE);
					const testsForPrompt = batch
						.map((t: Doc<"testDefinitionLatest">) => {
							// Parse definitionKey: projectId|name|file|line
							const parts = t.definitionKey.split("|");
							const name = parts[1] || "unknown";
							const file = parts[2] || "unknown";
							return `${t.definitionKey}: "${name}" in ${file} (${t.testType})`;
						})
						.join("\n");

					const mappingPrompt = `Map these tests to the features they cover.

## Features
${featuresForPrompt}

## Tests
${testsForPrompt}

## Instructions
For each test, determine which feature(s) it tests based on:
- Test name and what it describes
- File location and what code it likely exercises
- Test type (unit, integration, e2e)

Provide mappings with confidence scores. A test might map to 0, 1, or multiple features.
Only include mappings where confidence >= 0.5.`;

					try {
						const { object: mappingResult } = await generateObject({
							model: openai("gpt-5-mini"),
							schema: TestFeatureMappingSchema,
							prompt: mappingPrompt,
							system:
								"You are a test analysis expert. Map tests to features based on what functionality they verify. Be precise - only map tests to features they actually test.",
							temperature: 0.2,
						});

						// Store mappings
						for (const mapping of mappingResult.mappings) {
							if (mapping.featureIndex >= 0 && mapping.featureIndex < featureIds.length) {
								await ctx.runMutation(internal.codebaseAnalysis._createTestFeatureMapping, {
									projectId: args.projectId,
									testDefinitionKey: mapping.testDefinitionKey,
									featureId: featureIds[mapping.featureIndex],
									confidence: mapping.confidence,
									reason: mapping.reason,
									isUserConfirmed: false,
								});
								totalMapped++;
							}
						}
					} catch (error) {
						console.error("Batch mapping failed:", error);
						// Continue with next batch
					}

					// Small delay between batches
					await new Promise((resolve) => setTimeout(resolve, 500));
				}

				await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
					analysisId: args.analysisId,
					testsMapped: totalMapped,
				});
			}

			// Complete the analysis
			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				status: "completed",
				progress: { phase: "Complete", current: 4, total: 4 },
				completedAt: Date.now(),
			});
		} catch (error) {
			// Mark analysis as failed
			await ctx.runMutation(internal.codebaseAnalysis._updateAnalysis, {
				analysisId: args.analysisId,
				status: "failed",
				error: error instanceof Error ? error.message : String(error),
				completedAt: Date.now(),
			});
		}
	},
});

/**
 * Get the current analysis status for a project.
 */
export const getAnalysisStatus = action({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args): Promise<Doc<"codebaseAnalysis"> | null> => {
		return await ctx.runQuery(internal.codebaseAnalysis._getLatestAnalysis, {
			projectId: args.projectId,
		});
	},
});
