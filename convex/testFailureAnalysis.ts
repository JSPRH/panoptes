"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

function getOpenAIApiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) {
		throw new Error("OPENAI_API_KEY not configured in Convex secrets");
	}
	return key;
}

const TestFailureAnalysisSchema = z.object({
	summary: z.string().describe("A brief summary of what went wrong"),
	rootCause: z.string().describe("The root cause of the test failure"),
	suggestedFix: z.string().describe("A suggested fix for the issue"),
	codeLocation: z
		.string()
		.optional()
		.describe("The specific code location (file:line) where the issue likely occurs"),
	confidence: z.enum(["high", "medium", "low"]).describe("Confidence level in the analysis"),
	relatedFiles: z
		.array(z.string())
		.optional()
		.describe("Other files that might be related to this failure"),
});

export const analyzeTestFailure = action({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
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
		const existingAnalysis = await ctx.runQuery(api.testFailureAnalysis.getTestFailureAnalysis, {
			testId: args.testId,
		});

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
				.then((projects) => projects.find((p) => p._id === test.projectId));

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
				prompt += `\n\nCode Context (${codeSnippet.language}):
File: ${test.file}
Lines ${codeSnippet.startLine}-${codeSnippet.endLine}:

\`\`\`${codeSnippet.language}
${codeSnippet.content}
\`\`\`

The test failure is at line ${test.line}.
`;
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

			// Call OpenAI API
			const openai = createOpenAI({
				apiKey: getOpenAIApiKey(),
			});

			const { object: analysis } = await generateObject({
				model: openai("gpt-5-mini"),
				schema: TestFailureAnalysisSchema,
				prompt,
			});

			// Update analysis record with results
			await ctx.runMutation(api.testFailureAnalysis._updateTestFailureAnalysis, {
				analysisId,
				status: "completed",
				summary: analysis.summary,
				rootCause: analysis.rootCause,
				suggestedFix: analysis.suggestedFix,
				codeLocation: analysis.codeLocation,
				confidence: analysis.confidence,
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

export const getTestFailureAnalysis = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testFailureAnalysis")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();
	},
});

export const _createTestFailureAnalysis = mutation({
	args: {
		testId: v.id("tests"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
	},
	handler: async (ctx, args) => {
		// Check if analysis already exists
		const existing = await ctx.db
			.query("testFailureAnalysis")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();

		if (existing) {
			// If existing is "failed" and we're creating a "pending" one, update it to pending
			if (existing.status === "failed" && args.status === "pending") {
				await ctx.db.patch(existing._id, {
					status: "pending",
					createdAt: Date.now(),
				});
				return existing._id;
			}
			return existing._id;
		}

		return await ctx.db.insert("testFailureAnalysis", {
			testId: args.testId,
			status: args.status,
			createdAt: Date.now(),
		});
	},
});

export const _updateTestFailureAnalysis = mutation({
	args: {
		analysisId: v.id("testFailureAnalysis"),
		status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
		summary: v.optional(v.string()),
		rootCause: v.optional(v.string()),
		suggestedFix: v.optional(v.string()),
		codeLocation: v.optional(v.string()),
		confidence: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
		relatedFiles: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const { analysisId, ...updateData } = args;
		await ctx.db.patch(analysisId, {
			...updateData,
			updatedAt: Date.now(),
		});
	},
});
