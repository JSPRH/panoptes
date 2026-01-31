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

function generateCursorDeeplink(prompt: string): string {
	const encodedPrompt = encodeURIComponent(prompt);
	return `cursor://anysphere.cursor-deeplink/prompt?text=${encodedPrompt}`;
}

export const generateTestSuggestions = action({
	args: {
		file: v.string(),
		projectId: v.id("projects"),
		commitSha: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<Doc<"testSuggestions">> => {
		const commitSha = args.commitSha || "latest";

		// Check cache first
		const cached = await ctx.runQuery(api.tests.getTestSuggestions, {
			file: args.file,
			projectId: args.projectId,
			commitSha,
		});

		if (cached) {
			return cached;
		}

		// Get file coverage data
		const fileCoverageData = await ctx.runQuery(api.tests.getFileCoverage, {
			file: args.file,
		});

		if (!fileCoverageData) {
			throw new Error("File coverage data not found");
		}

		// Get file content from GitHub
		let fileContent = "";
		try {
			const contentResult = await ctx.runAction(api.github.getFileContent, {
				projectId: args.projectId,
				file: args.file,
				ref: fileCoverageData.testRun?.commitSha,
			});
			fileContent = contentResult.content;
		} catch (error) {
			console.warn("Failed to fetch file content from GitHub:", error);
			// Continue without file content - AI can still work with coverage data
		}

		// Parse coverage details
		const lineDetails = fileCoverageData.lineDetails
			? (JSON.parse(fileCoverageData.lineDetails) as { covered: number[]; uncovered: number[] })
			: null;

		const statementDetails = fileCoverageData.statementDetails
			? (JSON.parse(fileCoverageData.statementDetails) as Array<{
					id: string;
					startLine: number;
					endLine: number;
					covered: boolean;
				}>)
			: null;

		const uncoveredLines = lineDetails?.uncovered || [];
		const uncoveredStatements = statementDetails?.filter((s) => !s.covered) || [];
		const uncoveredBranches =
			fileCoverageData.branchesTotal != null && fileCoverageData.branchesTotal > 0
				? fileCoverageData.branchesTotal - (fileCoverageData.branchesCovered ?? 0)
				: 0;

		const coverage =
			fileCoverageData.linesTotal > 0
				? (fileCoverageData.linesCovered / fileCoverageData.linesTotal) * 100
				: 0;

		// Build AI prompt
		const uncoveredLinesList =
			uncoveredLines.length > 0
				? uncoveredLines.slice(0, 50).join(", ") +
					(uncoveredLines.length > 50 ? ` and ${uncoveredLines.length - 50} more` : "")
				: "none (all lines covered)";

		const uncoveredStatementsList =
			uncoveredStatements.length > 0
				? uncoveredStatements
						.slice(0, 20)
						.map((s) => `Statement ${s.id} (lines ${s.startLine}-${s.endLine})`)
						.join(", ") +
					(uncoveredStatements.length > 20 ? ` and ${uncoveredStatements.length - 20} more` : "")
				: "none";

		let prompt = `Analyze this file and propose test suggestions to improve code coverage.

File: ${args.file}
Current Coverage: ${coverage.toFixed(1)}%
Lines Covered: ${fileCoverageData.linesCovered}/${fileCoverageData.linesTotal}
Statements Covered: ${fileCoverageData.statementsCovered ?? 0}/${fileCoverageData.statementsTotal ?? 0}
Branches Covered: ${fileCoverageData.branchesCovered ?? 0}/${fileCoverageData.branchesTotal ?? 0}
Functions Covered: ${fileCoverageData.functionsCovered ?? 0}/${fileCoverageData.functionsTotal ?? 0}

Uncovered Lines: ${uncoveredLinesList}
Uncovered Statements: ${uncoveredStatementsList}
Uncovered Branches: ${uncoveredBranches}

`;

		if (fileContent) {
			prompt += `File Content:
\`\`\`
${fileContent}
\`\`\`

`;
		} else {
			prompt +=
				"Note: Full file content is not available, but you can still provide suggestions based on the coverage data.\n\n";
		}

		prompt += `For each test suggestion, provide:
1. Title: Brief, descriptive title (e.g., "Test error handling for invalid input")
2. Description: Detailed explanation of what to test and why it's valuable
3. Value Score (0-1): How valuable this test is considering:
   - User journey impact (does this affect critical paths?)
   - Bug prevention potential
   - Edge cases and error handling coverage
   - Integration point coverage
4. Difficulty: "low", "medium", or "high" based on implementation complexity
5. Estimated Runtime: Approximate milliseconds the test will take (optional, only if you can estimate)
6. Test Type: "unit", "integration", or "e2e" based on what makes sense
7. Uncovered Lines: Array of line numbers this test would cover (be specific)
8. Prompt: A detailed, actionable prompt for Cursor AI to generate this specific test. The prompt should:
   - Be specific about what to test
   - Include the file path and uncovered lines
   - Reference the function/component being tested
   - Provide context about expected behavior
   - Follow existing test patterns in the codebase

Consider:
- User journey impact (does this affect critical paths?)
- Edge cases and error handling
- Integration points
- Test pyramid balance (prefer unit tests when possible)
- Existing test patterns in the codebase
- The value-to-effort ratio

Generate 3-7 test suggestions, prioritizing high-value tests that cover critical paths and edge cases.`;

		// Call OpenAI API using Vercel AI SDK
		const openai = createOpenAI({
			apiKey: getOpenAIApiKey(),
		});

		const suggestionSchema = z.object({
			suggestions: z.array(
				z.object({
					title: z.string(),
					description: z.string(),
					value: z.number().min(0).max(1),
					difficulty: z.enum(["low", "medium", "high"]),
					estimatedRuntime: z.number().optional(),
					testType: z.enum(["unit", "integration", "e2e"]),
					uncoveredLines: z.array(z.number()),
					prompt: z.string(),
				})
			),
		});

		const { object: suggestionData } = await generateObject({
			model: openai("gpt-5-mini"),
			system:
				"You are an expert software engineer specializing in test strategy and code coverage. Provide clear, actionable test suggestions that balance value, effort, and maintainability.",
			prompt,
			schema: suggestionSchema,
			temperature: 0.3,
		});

		// Generate Cursor deeplinks for each suggestion
		const suggestionsWithDeeplinks = suggestionData.suggestions.map((suggestion) => ({
			...suggestion,
			cursorDeeplink: generateCursorDeeplink(suggestion.prompt),
		}));

		// Store in database
		await ctx.runMutation(internal.testSuggestions._createTestSuggestions, {
			projectId: args.projectId,
			file: args.file,
			commitSha,
			suggestions: suggestionsWithDeeplinks,
			model: "gpt-5-mini",
		});

		// Return the created document
		const created = await ctx.runQuery(api.tests.getTestSuggestions, {
			file: args.file,
			projectId: args.projectId,
			commitSha,
		});

		if (!created) {
			throw new Error("Failed to create test suggestions");
		}

		return created;
	},
});
