"use node";

import { v } from "convex/values";
import type { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
	TestFailureAnalysisSchema,
	analyzeFailure,
	analyzeFailureWithImages,
	formatCodeSnippet,
	getCursorApiKey,
	normalizeRepositoryUrl,
} from "./aiAnalysisUtils";

export const analyzeTestFailure = action({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args): Promise<Doc<"testFailureAnalysis"> | null> => {
		// Get test execution
		const test = await ctx.runQuery(api.tests.getTestExecution, {
			testId: args.testId,
		});

		if (!test) {
			throw new Error("Test execution not found");
		}

		if (test.status !== "failed") {
			throw new Error("Can only analyze failed tests");
		}

		// Check if analysis already exists
		const existingAnalysis: Doc<"testFailureAnalysis"> | null = await ctx.runQuery(
			api.testFailureAnalysis.getTestFailureAnalysis,
			{
				testId: args.testId,
			}
		);

		if (existingAnalysis && existingAnalysis.status === "completed") {
			return existingAnalysis;
		}

		// Create pending analysis record
		const analysisId = await ctx.runMutation(api.testFailureAnalysis._createTestFailureAnalysis, {
			testId: args.testId,
			status: "pending",
		});

		try {
			// Get test run for context
			const testRun = await ctx.runQuery(api.tests.getTestRun, {
				runId: test.testRunId,
			});

			// Get project for repository info
			const project = await ctx
				.runQuery(api.tests.getProjects)
				.then((projects) => projects.find((p: Doc<"projects">) => p._id === test.projectId));

			// Get code snippet if available
			let codeSnippet: {
				content: string;
				language: string;
				startLine: number;
				endLine: number;
			} | null = null;
			if (test.file && test.line && project?.repository) {
				try {
					codeSnippet = await ctx.runAction(api.github.getCodeSnippet, {
						projectId: test.projectId,
						file: test.file,
						line: test.line,
						commitSha: testRun?.commitSha,
						contextLines: 20, // Get more context for better analysis
					});
				} catch (error) {
					console.warn("Failed to fetch code snippet:", error);
					// Continue without code snippet
				}
			}

			// Check if this is an e2e test and get screenshots
			const isE2ETest = testRun?.testType === "e2e";
			let screenshots: Array<{ url: string; contentType: string }> = [];

			if (isE2ETest) {
				// Get attachments (screenshots) for e2e tests
				try {
					const attachmentsWithUrls = await ctx.runAction(api.tests.getTestAttachmentsWithUrls, {
						testId: args.testId,
					});
					// Filter for image attachments (screenshots)
					screenshots = attachmentsWithUrls
						.filter(
							(att): att is typeof att & { url: string } =>
								att.url !== null && att.contentType.startsWith("image/")
						)
						.map((att) => ({
							url: att.url,
							contentType: att.contentType,
						}));
				} catch (error) {
					console.warn("Failed to fetch attachments:", error);
					// Continue without screenshots
				}
			}

			// Build prompt for AI
			let prompt = `Analyze this test failure and provide insights on what went wrong.

Test Information:
- Test Name: ${test.name}
- File: ${test.file}${test.line ? `:${test.line}` : ""}
- Status: ${test.status}
- Duration: ${test.duration}ms
${test.suite ? `- Suite: ${test.suite}` : ""}
${test.tags && test.tags.length > 0 ? `- Tags: ${test.tags.join(", ")}` : ""}

Error Message:
${test.error || "No error message available"}

${test.errorDetails ? `Error Details:\n${test.errorDetails}` : ""}

${test.stdout ? `Stdout:\n${test.stdout}` : ""}

${test.stderr ? `Stderr:\n${test.stderr}` : ""}
`;

			if (codeSnippet) {
				prompt += formatCodeSnippet({
					content: codeSnippet.content,
					language: codeSnippet.language,
					file: test.file,
					startLine: codeSnippet.startLine,
					endLine: codeSnippet.endLine,
					targetLine: test.line,
				});
			}

			if (testRun) {
				prompt += `\nTest Run Context:
- Framework: ${testRun.framework}
- Test Type: ${testRun.testType}
${testRun.commitSha ? `- Commit: ${testRun.commitSha}` : ""}
${testRun.ci ? "- CI Run" : "- Local Run"}
`;
			}

			if (isE2ETest && screenshots.length > 0) {
				prompt += `\n\nThis is an end-to-end test. ${screenshots.length} screenshot(s) are attached showing the state of the application when the test failed. Please analyze the screenshots along with the error messages to understand what went wrong.`;
			}

			prompt += `\nPlease analyze this test failure and provide:
1. A brief summary of what went wrong
2. The root cause of the failure
3. A suggested fix
4. The specific code location where the issue likely occurs (if applicable)
5. Your confidence level in this analysis
6. Any related files that might be involved

Be specific and actionable. Focus on helping the developer understand and fix the issue quickly.`;

			// Use vision model for e2e tests with screenshots, otherwise use text-only model
			let analysis: z.infer<typeof TestFailureAnalysisSchema>;
			if (isE2ETest && screenshots.length > 0) {
				// Use vision model with screenshots
				analysis = await analyzeFailureWithImages({
					schema: TestFailureAnalysisSchema,
					prompt,
					images: screenshots,
					system:
						"You are an expert software engineer analyzing end-to-end test failures. You can see screenshots from the test execution. Analyze both the error messages and the visual state shown in the screenshots to provide clear, actionable insights that help developers understand and fix issues quickly.",
				});
			} else {
				// Use text-only model
				analysis = await analyzeFailure({
					schema: TestFailureAnalysisSchema,
					prompt,
					system:
						"You are an expert software engineer analyzing test failures. Provide clear, actionable insights that help developers understand and fix issues quickly.",
				});
			}

			// Update analysis record with results
			// Normalize confidence to enum if it's a number
			const confidenceValue =
				typeof analysis.confidence === "number"
					? analysis.confidence >= 0.7
						? "high"
						: analysis.confidence >= 0.4
							? "medium"
							: "low"
					: analysis.confidence;

			await ctx.runMutation(api.testFailureAnalysis._updateTestFailureAnalysis, {
				analysisId,
				status: "completed",
				summary: analysis.summary,
				rootCause: analysis.rootCause,
				suggestedFix: analysis.suggestedFix,
				codeLocation: analysis.codeLocation || undefined,
				confidence: confidenceValue,
				relatedFiles: analysis.relatedFiles || undefined,
			});

			// Return the completed analysis
			return await ctx.runQuery(api.testFailureAnalysis.getTestFailureAnalysis, {
				testId: args.testId,
			});
		} catch (error) {
			// Mark analysis as failed
			await ctx.runMutation(api.testFailureAnalysis._updateTestFailureAnalysis, {
				analysisId,
				status: "failed",
			});

			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to analyze test failure: ${errorMessage}`);
		}
	},
});

/**
 * Trigger a Cursor Cloud Agent to fix a test failure.
 * This calls the Cursor Cloud Agents API to launch an agent.
 * See: https://cursor.com/docs/cloud-agent/api/endpoints
 */
export const triggerCloudAgentForTest = action({
	args: {
		testId: v.id("tests"),
		actionType: v.union(v.literal("fix_test"), v.literal("fix_bug")),
	},
	handler: async (ctx, args) => {
		// Get test execution details
		const test = await ctx.runQuery(api.tests.getTestExecution, {
			testId: args.testId,
		});

		if (!test) {
			throw new Error("Test execution not found");
		}

		if (test.status !== "failed") {
			throw new Error("Can only trigger cloud agent for failed tests");
		}

		// Get project for repository info
		const project = await ctx
			.runQuery(api.tests.getProjects)
			.then((projects) => projects.find((p: Doc<"projects">) => p._id === test.projectId));

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
		}

		// Get test run for branch/commit info
		const testRun = await ctx.runQuery(api.tests.getTestRun, {
			runId: test.testRunId,
		});

		// Get test failure analysis if available
		const analysis = await ctx.runQuery(api.testFailureAnalysis.getTestFailureAnalysis, {
			testId: args.testId,
		});

		// Build prompt based on action type
		let prompt = "";
		const testContext = `${test.file}${test.line ? `:${test.line}` : ""}`;

		if (args.actionType === "fix_test") {
			// Focus on test code, assertions, mocking
			prompt = `Fix the failing test "${test.name}" in file ${testContext}.

${test.error ? `Error: ${test.error}` : "Test failed"}

${test.errorDetails ? `Error Details:\n${test.errorDetails}` : ""}

${analysis?.summary ? `Analysis Summary: ${analysis.summary}` : ""}
${analysis?.rootCause ? `Root Cause: ${analysis.rootCause}` : ""}
${analysis?.suggestedFix ? `Suggested Fix: ${analysis.suggestedFix}` : ""}

Focus on:
- Fixing test code, assertions, and expectations
- Updating mocks and test fixtures
- Correcting test setup/teardown
- Ensuring tests accurately reflect expected behavior

Please fix the test and ensure it passes.`;
		} else {
			// Focus on production code, logic errors
			prompt = `Fix the bug causing the test "${test.name}" to fail in file ${testContext}.

${test.error ? `Test Error: ${test.error}` : "Test failed"}

${test.errorDetails ? `Error Details:\n${test.errorDetails}` : ""}

${analysis?.summary ? `Analysis Summary: ${analysis.summary}` : ""}
${analysis?.rootCause ? `Root Cause: ${analysis.rootCause}` : ""}
${analysis?.suggestedFix ? `Suggested Fix: ${analysis.suggestedFix}` : ""}
${analysis?.codeLocation ? `Code Location: ${analysis.codeLocation}` : ""}

Focus on:
- Fixing production code logic errors
- Correcting business logic issues
- Fixing API/function implementations
- Ensuring code correctness and edge case handling

Please fix the bug and ensure the test passes.`;
		}

		const apiKey = getCursorApiKey();

		// Determine branch/ref to use
		let ref = "main";
		if (testRun?.ciRunId) {
			const ciRun = await ctx.runQuery(internal.github._getCIRunById, {
				ciRunId: testRun.ciRunId,
			});
			if (ciRun?.branch) {
				ref = ciRun.branch;
			}
		} else if (testRun?.commitSha) {
			// Use commit SHA if available
			ref = testRun.commitSha;
		}

		// Normalize repository URL to full GitHub URL format required by Cursor API
		const repository = normalizeRepositoryUrl(project.repository);

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
		const agentUrl = result.target?.url || `https://cursor.com/agents?id=${result.id}`;

		return {
			agentId: result.id,
			agentUrl,
			prUrl: result.target?.prUrl,
			action: args.actionType,
		};
	},
});
