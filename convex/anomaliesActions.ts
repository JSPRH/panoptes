"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

function getOpenAIApiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) {
		throw new Error("OPENAI_API_KEY not configured in Convex secrets");
	}
	return key;
}

const anomalyInsightSchema = z.object({
	insights: z.string(), // Actionable recommendations
	rootCause: z.string().optional(), // Likely root cause
	suggestedFix: z.string().optional(), // Specific fix suggestions
	confidence: z.number().min(0).max(1), // Confidence in analysis
});

const overallInsightSchema = z.object({
	summary: z.string(), // Overall summary of test suite health
	keyPatterns: z.array(z.string()), // Key patterns identified
	recommendations: z.array(z.string()), // High-level recommendations
	priorityActions: z.array(z.string()), // Priority actions to take
});

export const analyzeAnomalies = action({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		// First, ensure anomalies are detected
		await ctx.runMutation(api.anomalies.detectAnomalies, {
			projectId: args.projectId,
		});

		// Get all unresolved anomalies for the project
		const anomalies = await ctx.runQuery(api.anomalies.getAnomalies, {
			projectId: args.projectId,
			resolved: false,
		});

		if (anomalies.length === 0) {
			return {
				analyzed: 0,
				overallInsights: null,
			};
		}

		const openai = createOpenAI({
			apiKey: getOpenAIApiKey(),
		});

		// Analyze each anomaly
		const analyzedAnomalies: Array<{
			anomalyId: Id<"anomalies">;
			insights: string;
			rootCause?: string;
			suggestedFix?: string;
			confidence: number;
		}> = [];

		for (const anomaly of anomalies) {
			try {
				// Get the test to find file and name
				const test = await ctx.runQuery(api.tests.getTestExecution, {
					testId: anomaly.testId,
				});

				if (!test) {
					console.warn(`Test ${anomaly.testId} not found for anomaly ${anomaly._id}`);
					continue;
				}

				// Get test execution history
				const executions = await ctx.runQuery(api.tests.getTestDefinitionExecutions, {
					projectId: args.projectId,
					name: test.name,
					file: test.file,
					line: test.line,
					limit: 50, // Get last 50 executions for analysis
				});

				// Build context for LLM
				const passCount = executions.filter((e) => e.status === "passed").length;
				const failCount = executions.filter((e) => e.status === "failed").length;
				const totalRuns = executions.length;
				const avgDuration =
					executions.reduce((sum, e) => sum + e.duration, 0) / executions.length || 0;
				const recentErrors = executions
					.filter((e) => e.error)
					.slice(0, 5)
					.map((e) => ({
						error: e.error,
						errorDetails: e.errorDetails,
						duration: e.duration,
					}));

				// Build prompt
				let prompt = `Analyze this test anomaly and provide actionable insights.

Test: ${anomaly.testName}
File: ${test.file}${test.line ? `:${test.line}` : ""}
Anomaly Type: ${anomaly.type}
Severity: ${anomaly.severity}

Test Statistics:
- Total Executions: ${totalRuns}
- Passed: ${passCount} (${totalRuns > 0 ? ((passCount / totalRuns) * 100).toFixed(1) : 0}%)
- Failed: ${failCount} (${totalRuns > 0 ? ((failCount / totalRuns) * 100).toFixed(1) : 0}%)
- Average Duration: ${(avgDuration / 1000).toFixed(2)}s
`;

				if (anomaly.details) {
					prompt += `\nAnomaly Details:\n${JSON.stringify(anomaly.details, null, 2)}\n`;
				}

				if (recentErrors.length > 0) {
					prompt += "\nRecent Error Messages:\n";
					for (const err of recentErrors) {
						prompt += `- ${err.error || "Unknown error"}\n`;
						if (err.errorDetails) {
							prompt += `  Details: ${err.errorDetails.substring(0, 200)}...\n`;
						}
					}
				}

				prompt += `\nPlease provide:
1. Insights: Actionable recommendations for addressing this anomaly (2-3 sentences)
2. Root Cause: Likely root cause of the issue (if identifiable)
3. Suggested Fix: Specific steps or code changes to fix the issue (if applicable)
4. Confidence: Your confidence level (0-1) in this analysis

Focus on practical, actionable advice that helps developers understand and fix the issue.`;

				const { object: insight } = await generateObject({
					model: openai("gpt-4"),
					system:
						"You are an expert software engineer specializing in test quality and debugging. Provide clear, actionable insights that help developers understand and fix test anomalies.",
					prompt,
					schema: anomalyInsightSchema,
					temperature: 0.3,
				});

				// Store insights in the anomaly
				await ctx.runMutation(api.anomalies.updateAnomalyInsights, {
					anomalyId: anomaly._id,
					insights: insight.insights,
					rootCause: insight.rootCause,
					suggestedFix: insight.suggestedFix,
					confidence: insight.confidence,
				});

				analyzedAnomalies.push({
					anomalyId: anomaly._id,
					...insight,
				});
			} catch (error) {
				console.error(`Failed to analyze anomaly ${anomaly._id}:`, error);
				// Continue with other anomalies
			}
		}

		// Generate overall summary
		let overallInsights: {
			summary: string;
			keyPatterns: string[];
			recommendations: string[];
			priorityActions: string[];
		} | null = null;

		if (analyzedAnomalies.length > 0) {
			try {
				const anomalySummary = anomalies
					.map((a) => {
						const insight = analyzedAnomalies.find((ai) => ai.anomalyId === a._id);
						return `- ${a.testName} (${a.type}, ${a.severity}): ${insight?.insights || "No insights"}`;
					})
					.join("\n");

				const prompt = `Analyze this test suite's anomalies and provide overall insights.

Total Anomalies: ${anomalies.length}
Breakdown:
- Flaky: ${anomalies.filter((a) => a.type === "flaky").length}
- Slow: ${anomalies.filter((a) => a.type === "slow").length}
- Frequently Failing: ${anomalies.filter((a) => a.type === "frequently_failing").length}
- Resource Intensive: ${anomalies.filter((a) => a.type === "resource_intensive").length}

Individual Anomaly Insights:
${anomalySummary}

Please provide:
1. Summary: Overall assessment of test suite health (2-3 sentences)
2. Key Patterns: 3-5 key patterns or trends you notice across these anomalies
3. Recommendations: 3-5 high-level recommendations for improving test suite quality
4. Priority Actions: 3-5 specific priority actions to take, ordered by impact

Focus on actionable, high-level insights that help teams improve their testing practices.`;

				const result = await generateObject({
					model: openai("gpt-4"),
					system:
						"You are an expert software engineer specializing in test strategy and quality. Provide clear, actionable insights at the test suite level.",
					prompt,
					schema: overallInsightSchema,
					temperature: 0.3,
				});

				const overall: z.infer<typeof overallInsightSchema> = result.object;
				overallInsights = overall;
			} catch (error) {
				console.error("Failed to generate overall insights:", error);
			}
		}

		return {
			analyzed: analyzedAnomalies.length,
			overallInsights,
		};
	},
});
