"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Get OpenAI API key from environment variables.
 * Throws an error if not configured.
 */
export function getOpenAIApiKey(): string {
	const key = process.env.OPENAI_API_KEY;
	if (!key) {
		throw new Error("OPENAI_API_KEY not configured in Convex secrets");
	}
	return key;
}

/**
 * Get Cursor API key from environment variables.
 * Throws an error if not configured.
 */
export function getCursorApiKey(): string {
	const key = process.env.CURSOR_API_KEY;
	if (!key) {
		throw new Error("CURSOR_API_KEY not configured in Convex secrets");
	}
	return key;
}

/**
 * Create an OpenAI client instance.
 */
export function createOpenAIClient() {
	return createOpenAI({
		apiKey: getOpenAIApiKey(),
	});
}

/**
 * Common analysis result schema for failure analysis.
 * Used by both test failure and CI run failure analysis.
 */
export const BaseFailureAnalysisSchema = z.object({
	summary: z.string().describe("A brief summary of what went wrong"),
	rootCause: z.string().describe("The root cause of the failure"),
	suggestedFix: z.string().describe("A suggested fix for the issue"),
	confidence: z
		.union([z.number().min(0).max(1), z.enum(["high", "medium", "low"])])
		.describe("Confidence level in the analysis (0-1 number or high/medium/low)"),
});

/**
 * Extended schema for test failure analysis with code location and related files.
 */
export const TestFailureAnalysisSchema = BaseFailureAnalysisSchema.extend({
	codeLocation: z
		.string()
		.optional()
		.describe("The specific code location (file:line) where the issue likely occurs"),
	relatedFiles: z
		.array(z.string())
		.optional()
		.describe("Other files that might be related to this failure"),
});

/**
 * Extended schema for CI run failure analysis with additional fields.
 * Note: Uses 'proposedFix' instead of 'suggestedFix' for consistency with existing code.
 */
export const CIRunFailureAnalysisSchema = BaseFailureAnalysisSchema.omit({
	suggestedFix: true,
}).extend({
	proposedFix: z.string().describe("A suggested fix for the issue"),
	title: z.string().describe("A very short, concise title summarizing the failure (max 10 words)"),
	proposedTest: z.string().describe("A test case that would prevent this regression in the future"),
	isFlaky: z
		.boolean()
		.describe("Whether this is likely a flaky test/infrastructure issue that would pass on retry"),
});

/**
 * Normalize confidence value to a number between 0 and 1.
 */
export function normalizeConfidence(confidence: number | "high" | "medium" | "low"): number {
	if (typeof confidence === "number") {
		return Math.max(0, Math.min(1, confidence));
	}
	switch (confidence) {
		case "high":
			return 0.8;
		case "medium":
			return 0.5;
		case "low":
			return 0.2;
		default:
			return 0.5;
	}
}

/**
 * Generate Cursor deeplink from a prompt.
 * Truncates if necessary to stay under 8000 character limit.
 */
export function generateCursorDeeplink(prompt: string): string {
	const maxLength = 8000;
	let encodedPrompt = encodeURIComponent(prompt);
	let deeplink = `https://cursor.com/link/prompt?text=${encodedPrompt}`;

	if (deeplink.length > maxLength) {
		// Truncate prompt and try again
		const truncatedPrompt = prompt.substring(0, Math.floor(prompt.length * 0.7));
		encodedPrompt = encodeURIComponent(truncatedPrompt);
		deeplink = `https://cursor.com/link/prompt?text=${encodedPrompt}`;

		// If still too long, use ultra-short version
		if (deeplink.length > maxLength) {
			const ultraShortPrompt = prompt.substring(0, 500);
			encodedPrompt = encodeURIComponent(ultraShortPrompt);
			deeplink = `https://cursor.com/link/prompt?text=${encodedPrompt}`;
		}
	}

	return deeplink;
}

/**
 * Generate a concise Cursor prompt for fixing an issue.
 */
export function generateFixPrompt(options: {
	title: string;
	summary: string;
	rootCause: string;
	suggestedFix: string;
	context?: string;
}): string {
	const { title, summary, rootCause, suggestedFix, context } = options;

	let prompt = `Fix: ${title}\n\n${summary}\n\nRoot cause: ${rootCause}\n\nFix: ${suggestedFix}`;

	if (context) {
		prompt += `\n\nContext:\n${context}`;
	}

	prompt += "\n\nFix and ensure tests pass.";

	return prompt;
}

/**
 * Analyze a failure using GPT-5-mini with a given schema.
 * This is a generic helper that can be used by different analysis types.
 */
export async function analyzeFailure<T extends z.ZodTypeAny>(options: {
	schema: T;
	prompt: string;
	system?: string;
	temperature?: number;
}): Promise<z.infer<T>> {
	const { schema, prompt, system, temperature = 0.3 } = options;

	const openai = createOpenAIClient();

	const { object: analysis } = await generateObject({
		model: openai("gpt-5-mini"),
		schema,
		prompt,
		system:
			system ||
			"You are an expert software engineer analyzing failures. Provide clear, actionable insights.",
		temperature,
	});

	return analysis as z.infer<T>;
}

/**
 * Format code snippet for inclusion in prompts.
 */
export function formatCodeSnippet(options: {
	content: string;
	language: string;
	file: string;
	startLine: number;
	endLine: number;
	targetLine?: number;
}): string {
	const { content, language, file, startLine, endLine, targetLine } = options;

	let snippet = `\n\nCode Context (${language}):\nFile: ${file}\nLines ${startLine}-${endLine}:\n\n\`\`\`${language}\n${content}\n\`\`\``;

	if (targetLine) {
		snippet += `\n\nThe issue is at line ${targetLine}.`;
	}

	return snippet;
}
