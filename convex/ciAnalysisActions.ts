"use node";

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import {
	CIRunFailureAnalysisSchema,
	analyzeFailure,
	getCursorApiKey,
	normalizeRepositoryUrl,
	resolveRepositoryRef,
} from "./aiAnalysisUtils";

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

			// Call OpenAI API using shared utility
			const analysisData = await analyzeFailure({
				schema: CIRunFailureAnalysisSchema,
				prompt,
				system:
					"You are an expert software engineer analyzing CI/CD failures. Provide clear, actionable insights.",
				temperature: 0.3,
			});

			// Generate full Cursor prompt for background agent (can be longer)
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

			// Generate background agent data for Cloud Agents API
			// See: https://cursor.com/docs/cloud-agent/api/endpoints
			// Normalize repository URL to full GitHub URL format required by Cursor API
			// Use commit SHA as ref (more reliable than branch name - commits never change)
			// Fallback to branch name if commit SHA is not available
			const cursorBackgroundAgentData = {
				repository: normalizeRepositoryUrl(project.repository),
				ref: ciRun.commitSha || ciRun.branch,
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
					confidence:
						typeof analysisData.confidence === "number"
							? Math.max(0, Math.min(1, analysisData.confidence))
							: analysisData.confidence === "high"
								? 0.8
								: analysisData.confidence === "medium"
									? 0.5
									: 0.2,
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
 * Can work with or without AI analysis - if analysis exists, uses it; otherwise builds prompt from CI run data.
 * See: https://cursor.com/docs/cloud-agent/api/endpoints
 */
export const triggerCursorCloudAgent = action({
	args: {
		ciRunId: v.id("ciRuns"),
		actionType: v.optional(
			v.union(v.literal("restart_ci"), v.literal("fix_test"), v.literal("fix_bug"))
		),
		createPR: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		args
	): Promise<
		| { success: true; action: "restart_ci"; message: string }
		| {
				agentId: string;
				agentUrl: string;
				prUrl?: string;
				action: string;
				branch: string;
				commitSha?: string;
				createPR: boolean;
		  }
	> => {
		// Get CI run and project info
		const ciRun = await ctx.runQuery(internal.github._getCIRunById, {
			ciRunId: args.ciRunId,
		});

		if (!ciRun) {
			throw new Error("CI run not found");
		}

		// Get project for repository info
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: ciRun.projectId,
		});

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
		}

		const apiKey = getCursorApiKey();
		const repository = normalizeRepositoryUrl(project.repository);

		// Resolve the ref: verify branch exists, fallback to default branch
		const ref = await resolveRepositoryRef(repository, ciRun.branch, ciRun.commitSha);

		// Try to get analysis if it exists
		const analysis = await ctx.runQuery(api.ciAnalysis.getCIRunAnalysis, {
			ciRunId: args.ciRunId,
		});

		// If flaky and actionType is restart_ci, use GitHub API directly
		if (analysis?.analysis?.isFlaky && args.actionType === "restart_ci") {
			const rerunResult = await ctx.runAction(api.github.rerunCIRun, {
				ciRunId: args.ciRunId,
			});
			return {
				success: true,
				action: "restart_ci" as const,
				message: rerunResult.message,
			} as const;
		}

		// Build prompt - use analysis if available, otherwise build from CI run data
		let prompt = "";

		if (analysis?.analysis?.cursorBackgroundAgentData) {
			// Use existing analysis
			prompt = analysis.analysis.cursorBackgroundAgentData.prompt;

			if (args.actionType === "fix_test") {
				// Focus on test code, assertions, mocking
				prompt = `Fix the failing test(s) in the CI failure for ${analysis.analysis.title || "CI Failure"}.

${analysis.analysis.summary}

Root Cause: ${analysis.analysis.rootCause}

Focus on:
- Fixing test code, assertions, and expectations
- Updating mocks and test fixtures
- Correcting test setup/teardown
- Ensuring tests accurately reflect expected behavior

${analysis.analysis.proposedFix}

Please fix the test(s) and ensure they pass.`;
			} else if (args.actionType === "fix_bug") {
				// Focus on production code, logic errors
				prompt = `Fix the bug causing the CI failure for ${analysis.analysis.title || "CI Failure"}.

${analysis.analysis.summary}

Root Cause: ${analysis.analysis.rootCause}

Focus on:
- Fixing production code logic errors
- Correcting business logic issues
- Fixing API/function implementations
- Ensuring code correctness and edge case handling

${analysis.analysis.proposedFix}

Please fix the bug and ensure all tests pass.`;
			}
		} else {
			// Build prompt from CI run data (no analysis available)
			// Get failed tests if available
			const parsedTests = await ctx.runQuery(api.github.getCIRunParsedTests, {
				ciRunId: args.ciRunId,
			});
			const failedTests = parsedTests?.filter((t) => t.status === "failed") || [];

			const title = ciRun.workflowName || "CI Failure";
			const failedTestsList =
				failedTests.length > 0
					? failedTests
							.slice(0, 5)
							.map(
								(t) => `${t.testName}${t.file ? ` (${t.file}${t.line ? `:${t.line}` : ""})` : ""}`
							)
							.join("\n- ")
					: "No specific test failures identified";

			if (args.actionType === "fix_test") {
				prompt = `Fix the failing test(s) in the CI failure for ${title} on branch ${ciRun.branch} (commit ${ciRun.commitSha.substring(0, 7)}).

Failed Tests:
- ${failedTestsList}

${ciRun.commitMessage ? `Commit Message: ${ciRun.commitMessage}` : ""}

Please analyze the CI failure, identify the root cause, and fix the failing test(s). Focus on:
- Fixing test code, assertions, and expectations
- Updating mocks and test fixtures
- Correcting test setup/teardown
- Ensuring tests accurately reflect expected behavior

Ensure all tests pass after your changes.`;
			} else {
				// Default: fix_bug
				prompt = `Fix the bug causing the CI failure for ${title} on branch ${ciRun.branch} (commit ${ciRun.commitSha.substring(0, 7)}).

Failed Tests:
- ${failedTestsList}

${ciRun.commitMessage ? `Commit Message: ${ciRun.commitMessage}` : ""}

Please analyze the CI failure, identify the root cause, and fix the bug. Focus on:
- Fixing production code logic errors
- Correcting business logic issues
- Fixing API/function implementations
- Ensuring code correctness and edge case handling

Ensure all tests pass after your changes.`;
			}
		}

		// Determine if we should create a PR or push directly to branch
		const shouldCreatePR = args.createPR ?? true; // Default to true for backward compatibility

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
					autoCreatePr: shouldCreatePR,
					openAsCursorGithubApp: false,
					skipReviewerRequest: false,
				},
				model: "composer-1",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Cursor Cloud Agents API error: ${response.status} - ${errorText}`);
		}

		const result: {
			id: string;
			name: string;
			status: string;
			target?: {
				url?: string;
				prUrl?: string;
			};
		} = await response.json();

		// Construct agent URL with agent ID
		// Format: https://cursor.com/agents?id={agentId}
		const agentUrl = result.target?.url || `https://cursor.com/agents?id=${result.id}`;

		// Store agent ID and URL in analysis if analysis exists
		if (analysis) {
			const updateAnalysis: {
				title: string;
				summary: string;
				rootCause: string;
				proposedFix: string;
				proposedTest: string;
				isFlaky: boolean;
				confidence: number;
				cursorPrompt?: string;
				cursorBackgroundAgentData?: {
					repository: string;
					ref: string;
					prompt: string;
				};
				cursorAgentId: string;
				cursorAgentUrl: string;
			} = {
				title: analysis.analysis?.title || "CI Failure Analysis",
				summary: analysis.analysis?.summary || "",
				rootCause: analysis.analysis?.rootCause || "",
				proposedFix: analysis.analysis?.proposedFix || "",
				proposedTest: analysis.analysis?.proposedTest || "",
				isFlaky: analysis.analysis?.isFlaky || false,
				confidence: analysis.analysis?.confidence || 0.5,
				cursorAgentId: result.id,
				cursorAgentUrl: agentUrl,
			};

			if (analysis.analysis?.cursorPrompt) {
				updateAnalysis.cursorPrompt = analysis.analysis.cursorPrompt;
			}
			if (analysis.analysis?.cursorBackgroundAgentData) {
				updateAnalysis.cursorBackgroundAgentData = analysis.analysis.cursorBackgroundAgentData;
			}

			await ctx.runMutation(internal.ciAnalysis._updateCIRunAnalysis, {
				analysisId: analysis._id,
				status: analysis.status,
				analysis: updateAnalysis,
			});
		}

		return {
			agentId: result.id,
			agentUrl,
			prUrl: result.target?.prUrl,
			action: args.actionType || "fix_bug",
			branch: ciRun.branch,
			commitSha: ciRun.commitSha,
			createPR: shouldCreatePR,
		};
	},
});
