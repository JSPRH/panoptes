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

function getCursorApiKey(): string {
	const key = process.env.CURSOR_API_KEY;
	if (!key) {
		throw new Error("CURSOR_API_KEY not configured in Convex secrets");
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

		// Get project to access repository URL
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: ciRun.projectId,
		});

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
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

			// Get parsed test results
			const parsedTests = await ctx.runQuery(api.github.getCIRunParsedTests, {
				ciRunId: args.ciRunId,
			});
			const failedTests =
				parsedTests?.filter((test: Doc<"ciRunParsedTests">) => test.status === "failed") || [];

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

${failedTests.length > 0 ? `Failed Tests (${failedTests.length}):\n` : ""}`;

			// Add failed test information
			for (const test of failedTests.slice(0, 10) as Doc<"ciRunParsedTests">[]) {
				// Limit to first 10 failed tests
				prompt += `\n- ${test.testName}`;
				if (test.file) {
					prompt += ` (${test.file}${test.line ? `:${test.line}` : ""})`;
				}
				if (test.error) {
					const errorPreview = test.error.substring(0, 200);
					prompt += `\n  Error: ${errorPreview}${test.error.length > 200 ? "..." : ""}`;
				}
			}

			prompt += "\n\nFailed Jobs:\n";

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
  "title": "A very short, concise title summarizing the failure (max 10 words)",
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
				title: z.string(),
				summary: z.string(),
				rootCause: z.string(),
				proposedFix: z.string(),
				proposedTest: z.string(),
				isFlaky: z.boolean(),
				confidence: z.number().min(0).max(1),
			});

			const { object: analysisData } = await generateObject({
				model: openai("gpt-5-mini"),
				system:
					"You are an expert software engineer analyzing CI/CD failures. Provide clear, actionable insights.",
				prompt,
				schema: analysisSchema,
				temperature: 0.3,
			});

			// Generate Cursor prompt for both deeplink and background agent
			const cursorPrompt = `Fix the CI failure in ${ciRun.workflowName} on branch ${ciRun.branch} (commit ${ciRun.commitSha.substring(0, 7)}).

${analysisData.summary}

Root Cause: ${analysisData.rootCause}

			${
				failedTests.length > 0
					? `Failed Tests:\n${failedTests
							.slice(0, 5)
							.map(
								(t: Doc<"ciRunParsedTests">) =>
									`- ${t.testName}${t.file ? ` (${t.file}${t.line ? `:${t.line}` : ""})` : ""}${t.error ? `: ${t.error.substring(0, 100)}` : ""}`
							)
							.join("\n")}\n`
					: ""
			}

Proposed Fix: ${analysisData.proposedFix}

Please fix the issue and ensure all tests pass.`;

			// Generate Cursor deeplink (prompt format)
			// Format: cursor://anysphere.cursor-deeplink/prompt?text=<encoded>
			// See: https://cursor.com/docs/integrations/deeplinks
			const encodedPrompt = encodeURIComponent(cursorPrompt);
			const cursorDeeplink = `cursor://anysphere.cursor-deeplink/prompt?text=${encodedPrompt}`;

			// Generate background agent data for Cloud Agents API
			// See: https://cursor.com/docs/cloud-agent/api/endpoints
			const cursorBackgroundAgentData = {
				repository: project.repository,
				ref: ciRun.branch,
				prompt: cursorPrompt,
			};

			// Store analysis result
			await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
				analysisId,
				status: "completed",
				analysis: {
					title: analysisData.title,
					summary: analysisData.summary,
					rootCause: analysisData.rootCause,
					proposedFix: analysisData.proposedFix,
					proposedTest: analysisData.proposedTest,
					isFlaky: analysisData.isFlaky,
					confidence: Math.max(0, Math.min(1, analysisData.confidence)),
					cursorDeeplink,
					cursorPrompt,
					cursorBackgroundAgentData,
				},
				model: "gpt-5-mini",
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

/**
 * Trigger a Cursor Cloud Agent to fix a CI failure.
 * This calls the Cursor Cloud Agents API to launch an agent.
 * See: https://cursor.com/docs/cloud-agent/api/endpoints
 */
export const triggerCursorCloudAgent = action({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		const analysis = await ctx.runQuery(api.ciAnalysis.getCIRunAnalysis, {
			ciRunId: args.ciRunId,
		});

		if (!analysis || !analysis.analysis?.cursorBackgroundAgentData) {
			throw new Error("Analysis not found or background agent data not available");
		}

		const { repository, ref, prompt } = analysis.analysis.cursorBackgroundAgentData;
		const apiKey = getCursorApiKey();

		// Call Cursor Cloud Agents API
		// See: https://cursor.com/docs/cloud-agent/api/endpoints#launch-an-agent
		const response = await fetch("https://api.cursor.com/v0/agents", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
			},
			body: JSON.stringify({
				prompt: {
					text: prompt,
				},
				source: {
					repository,
					ref,
				},
				target: {
					autoCreatePr: true,
					openAsCursorGithubApp: false,
					skipReviewerRequest: false,
				},
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Cursor Cloud Agents API error: ${response.status} - ${errorText}`);
		}

		const result = (await response.json()) as {
			id: string;
			name: string;
			status: string;
			target?: {
				url?: string;
				prUrl?: string;
			};
		};

		// Construct agent URL with agent ID
		// Format: https://cursor.com/agents?id={agentId}
		const agentUrl = result.target?.url || `https://cursor.com/agents?id=${result.id}`;

		// Update deeplink to include agent ID reference
		// Add agent ID to the prompt so it's available when opening the deeplink
		let updatedDeeplink = analysis.analysis.cursorDeeplink;
		if (analysis.analysis.cursorDeeplink && analysis.analysis.cursorPrompt) {
			// Update the prompt to include agent reference
			const updatedPrompt = `${analysis.analysis.cursorPrompt}\n\nBackground Agent ID: ${result.id}\nAgent URL: ${agentUrl}`;
			const encodedPrompt = encodeURIComponent(updatedPrompt);
			updatedDeeplink = `cursor://anysphere.cursor-deeplink/prompt?text=${encodedPrompt}`;
		}

		// Store agent ID and URL in analysis (preserve existing analysis data)
		const updateAnalysis: {
			title: string;
			summary: string;
			rootCause: string;
			proposedFix: string;
			proposedTest: string;
			isFlaky: boolean;
			confidence: number;
			cursorDeeplink?: string;
			cursorPrompt?: string;
			cursorBackgroundAgentData?: {
				repository: string;
				ref: string;
				prompt: string;
			};
			cursorAgentId: string;
			cursorAgentUrl: string;
		} = {
			title: analysis.analysis.title,
			summary: analysis.analysis.summary,
			rootCause: analysis.analysis.rootCause,
			proposedFix: analysis.analysis.proposedFix,
			proposedTest: analysis.analysis.proposedTest,
			isFlaky: analysis.analysis.isFlaky,
			confidence: analysis.analysis.confidence,
			cursorAgentId: result.id,
			cursorAgentUrl: agentUrl,
		};

		if (updatedDeeplink) {
			updateAnalysis.cursorDeeplink = updatedDeeplink;
		}
		if (analysis.analysis.cursorPrompt) {
			updateAnalysis.cursorPrompt = analysis.analysis.cursorPrompt;
		}
		if (analysis.analysis.cursorBackgroundAgentData) {
			updateAnalysis.cursorBackgroundAgentData = analysis.analysis.cursorBackgroundAgentData;
		}

		await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
			analysisId: analysis._id,
			status: analysis.status,
			analysis: updateAnalysis,
		});

		return {
			agentId: result.id,
			agentUrl,
			prUrl: result.target?.prUrl,
		};
	},
});
