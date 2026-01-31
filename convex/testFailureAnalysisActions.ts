"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { TestFailureAnalysisSchema, analyzeFailure, formatCodeSnippet } from "./aiAnalysisUtils";

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

			prompt += `\nPlease analyze this test failure and provide:
1. A brief summary of what went wrong
2. The root cause of the failure
3. A suggested fix
4. The specific code location where the issue likely occurs (if applicable)
5. Your confidence level in this analysis
6. Any related files that might be involved

Be specific and actionable. Focus on helping the developer understand and fix the issue quickly.`;

			// Call OpenAI API using shared utility
			const analysis = await analyzeFailure({
				schema: TestFailureAnalysisSchema,
				prompt,
				system:
					"You are an expert software engineer analyzing test failures. Provide clear, actionable insights that help developers understand and fix issues quickly.",
			});

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
				codeLocation: analysis.codeLocation,
				confidence: confidenceValue,
				relatedFiles: analysis.relatedFiles,
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
