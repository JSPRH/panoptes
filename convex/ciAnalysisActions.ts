"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";

function getOpenAIApiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) {
		throw new Error("OPENAI_API_KEY not configured in Convex secrets");
	}
	return key;
}

/**
 * Internal action that processes a failed CI run by fetching logs and analyzing.
 * This chains the two operations: fetch logs → analyze.
 */
export const _processFailedCIRun = internalAction({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		try {
			// Check if analysis already exists and is completed
			const existingAnalysis = await ctx.runQuery(api.ciAnalysis.getCIRunAnalysis, {
				ciRunId: args.ciRunId,
			});

			if (existingAnalysis && existingAnalysis.status === "completed") {
				// Already analyzed, skip
				return;
			}

			// Check if jobs exist
			const jobs = await ctx.runQuery(api.github.getCIRunJobs, {
				ciRunId: args.ciRunId,
			});

			// If no jobs exist, fetch them first
			if (!jobs || jobs.length === 0) {
				try {
					await ctx.runAction(api.github.fetchCIRunJobs, {
						ciRunId: args.ciRunId,
					});
					// Wait a short delay to ensure logs are processed
					await new Promise((resolve) => setTimeout(resolve, 2000));
				} catch (error) {
					console.error(`Failed to fetch jobs for CI run ${args.ciRunId}:`, error);
					// Continue anyway - analysis might still work with available data
				}
			}

			// Trigger analysis
			await ctx.runAction(api.ciAnalysisActions.analyzeCIRunFailure, {
				ciRunId: args.ciRunId,
			});
		} catch (error) {
			// Log error but don't throw - we don't want to break the sync process
			console.error(`Failed to process CI run ${args.ciRunId}:`, error);
		}
	},
});

/**
 * Batch processing function for scheduled job.
 * Finds all failed CI runs without completed analysis and processes them.
 */
export const _processFailedCIRunsBatch = internalAction({
	args: {},
	handler: async (ctx) => {
		// Get all projects
		const projects = await ctx.runQuery(api.tests.getProjects);

		if (!projects || projects.length === 0) {
			return;
		}

		// Process each project
		for (const project of projects) {
			try {
				// Get failed CI runs for this project
				const failedRuns = await ctx.runQuery(api.github.getCIRunsForProject, {
					projectId: project._id,
					limit: 50, // Process up to 50 runs per project
				});

				// Filter to failed runs that don't have completed analysis
				for (const run of failedRuns || []) {
					if (run.conclusion === "failure" && run.status === "completed") {
						// Check if analysis exists and is completed
						const analysis = await ctx.runQuery(api.ciAnalysis.getCIRunAnalysis, {
							ciRunId: run._id,
						});

						// Only process if no analysis exists or it's not completed
						if (!analysis || analysis.status !== "completed") {
							// Process this run (with a small delay between runs to avoid rate limits)
							await ctx.runAction(internal.ciAnalysisActions._processFailedCIRun, {
								ciRunId: run._id,
							});
							// Small delay to avoid overwhelming the APIs
							await new Promise((resolve) => setTimeout(resolve, 1000));
						}
					}
				}
			} catch (error) {
				console.error(`Failed to process failed CI runs for project ${project._id}:`, error);
				// Continue with next project
			}
		}
	},
});

export const analyzeCIRunFailure = action({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args): Promise<Doc<"ciRunAnalysis"> | null> => {
		const ciRun = await ctx.runQuery(internal.github._getCIRunById, {
			ciRunId: args.ciRunId,
		});

		if (!ciRun) {
			throw new Error("CI run not found");
		}

		// Only analyze failed runs
		if (ciRun.conclusion !== "failure") {
			throw new Error("Can only analyze failed CI runs");
		}

		// Check if analysis already exists
		const existingAnalysis: Doc<"ciRunAnalysis"> | null = await ctx.runQuery(
			api.ciAnalysis.getCIRunAnalysis,
			{
				ciRunId: args.ciRunId,
			}
		);

		if (existingAnalysis && existingAnalysis.status === "completed") {
			return existingAnalysis;
		}

		// Create pending analysis record
		const analysisId = await ctx.runMutation(internal.ciAnalysis._createCIRunAnalysis, {
			ciRunId: args.ciRunId,
			status: "pending",
		});

		try {
			// Get all jobs for this CI run
			let jobs = await ctx.runQuery(api.github.getCIRunJobs, {
				ciRunId: args.ciRunId,
			});

			// If no jobs exist, try to fetch them automatically
			if (!jobs || jobs.length === 0) {
				try {
					await ctx.runAction(api.github.fetchCIRunJobs, {
						ciRunId: args.ciRunId,
					});
					// Wait a short delay to ensure logs are processed
					await new Promise((resolve) => setTimeout(resolve, 2000));
					// Try again to get jobs
					jobs = await ctx.runQuery(api.github.getCIRunJobs, {
						ciRunId: args.ciRunId,
					});
				} catch (error) {
					console.error(`Failed to auto-fetch jobs for CI run ${args.ciRunId}:`, error);
					// Continue with empty jobs - will fail gracefully below
				}
			}

			// Filter to failed jobs
			const failedJobs = jobs.filter(
				(job: Doc<"ciRunJobs">) => job.conclusion === "failure" || job.status === "completed"
			);

			if (failedJobs.length === 0) {
				// No failed jobs found, mark as failed
				await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
					analysisId,
					status: "failed",
				});
				throw new Error("No failed jobs found for analysis");
			}

			// Build prompt with job and step information
			let prompt = `Analyze this GitHub Actions CI failure:

Workflow: ${ciRun.workflowName}
Branch: ${ciRun.branch}
Commit: ${ciRun.commitSha.substring(0, 7)}
${ciRun.commitMessage ? `Commit Message: ${ciRun.commitMessage}` : ""}

Failed Jobs:\n`;

			for (const job of failedJobs) {
				prompt += `\n## Job: ${job.name}\n`;
				prompt += `Status: ${job.status}, Conclusion: ${job.conclusion || "unknown"}\n`;

				// Get steps for this job
				const steps = await ctx.runQuery(api.github.getCIRunJobSteps, {
					jobId: job._id,
				});

				for (const step of steps) {
					if (step.conclusion === "failure" || step.logs.length > 0) {
						prompt += `\n### Step: ${step.name}\n`;
						if (step.conclusion === "failure") {
							prompt += "Status: FAILED\n";
						}
						// Truncate logs to last 2000 characters (most relevant errors are at the end)
						const relevantLogs =
							step.logs.length > 2000 ? step.logs.substring(step.logs.length - 2000) : step.logs;
						prompt += `Logs:\n\`\`\`\n${relevantLogs}\n\`\`\`\n`;
					}
				}
			}

			prompt += `\nPlease provide a JSON response with the following structure:
{
  "summary": "Brief summary of what went wrong (2-3 sentences)",
  "rootCause": "Detailed root cause analysis explaining why the failure occurred",
  "proposedFix": "Specific steps or code changes to fix the issue",
  "proposedTest": "A test case that would prevent this regression in the future",
  "isFlaky": boolean indicating if this is likely a flaky test/infrastructure issue that would pass on retry,
  "confidence": number between 0 and 1 indicating confidence in the analysis
}`;

			// Call OpenAI API using Vercel AI SDK
			const openai = createOpenAI({
				apiKey: getOpenAIApiKey(),
			});

			const analysisSchema = z.object({
				summary: z.string(),
				rootCause: z.string(),
				proposedFix: z.string(),
				proposedTest: z.string(),
				isFlaky: z.boolean(),
				confidence: z.number().min(0).max(1),
			});

			const { object: analysisData } = await generateObject({
				model: openai("gpt-4"),
				system:
					"You are an expert software engineer analyzing CI/CD failures. Provide clear, actionable insights.",
				prompt,
				schema: analysisSchema,
				temperature: 0.3,
			});

			// Store analysis result
			await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
				analysisId,
				status: "completed",
				analysis: {
					summary: analysisData.summary,
					rootCause: analysisData.rootCause,
					proposedFix: analysisData.proposedFix,
					proposedTest: analysisData.proposedTest,
					isFlaky: analysisData.isFlaky,
					confidence: Math.max(0, Math.min(1, analysisData.confidence)),
				},
				model: "gpt-4",
			});

			// Return the analysis
			return await ctx.runQuery(api.ciAnalysis.getCIRunAnalysis, {
				ciRunId: args.ciRunId,
			});
		} catch (error) {
			// Mark analysis as failed
			await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
				analysisId,
				status: "failed",
			});
			throw error;
		}
	},
});
