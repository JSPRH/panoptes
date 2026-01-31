"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";

function getOpenAIApiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) {
		throw new Error("OPENAI_API_KEY not configured in Convex secrets");
	}
	return key;
}

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
			const jobs = await ctx.runQuery(api.github.getCIRunJobs, {
				ciRunId: args.ciRunId,
			});

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
