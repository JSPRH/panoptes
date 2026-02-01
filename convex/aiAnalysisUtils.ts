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
 * Parse repository URL to extract owner and repo.
 * Supports formats: https://github.com/owner/repo, git@github.com:owner/repo.git, owner/repo
 */
function parseRepositoryUrl(repository: string): { owner: string; repo: string } | null {
	const patterns = [
		/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/,
		/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
		/^([^\/]+)\/([^\/]+)$/,
	];

	for (const pattern of patterns) {
		const match = repository.match(pattern);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
	}
	return null;
}

/**
 * Normalize a repository URL to the full GitHub URL format required by Cursor Cloud Agents API.
 * Supports formats: https://github.com/owner/repo, git@github.com:owner/repo.git, owner/repo
 * Returns: https://github.com/owner/repo
 */
export function normalizeRepositoryUrl(repository: string): string {
	// If already a full GitHub URL, return as-is
	if (repository.startsWith("https://github.com/")) {
		// Remove trailing .git if present
		return repository.replace(/\.git$/, "").replace(/\/$/, "");
	}

	// Parse owner/repo from various formats
	const parsed = parseRepositoryUrl(repository);
	if (parsed) {
		return `https://github.com/${parsed.owner}/${parsed.repo}`;
	}

	// If we can't parse it, throw an error
	throw new Error(
		`Invalid repository URL format: ${repository}. Expected formats: https://github.com/owner/repo, git@github.com:owner/repo.git, or owner/repo`
	);
}

/**
 * Resolve a ref (branch) for use with Cursor Cloud Agents API.
 * The Cursor API requires branch names (not commit SHAs) and verifies branch existence.
 * This function verifies the branch exists and falls back to the default branch if needed.
 * @param repository - Full GitHub repository URL (e.g., https://github.com/owner/repo)
 * @param preferredRef - Preferred branch name
 * @param commitSha - Commit SHA (not used, but kept for API compatibility)
 * @returns Resolved branch name
 */
export async function resolveRepositoryRef(
	repository: string,
	preferredRef?: string,
	commitSha?: string
): Promise<string> {
	const repoInfo = parseRepositoryUrl(repository);
	if (!repoInfo) {
		throw new Error(`Invalid repository URL: ${repository}`);
	}

	const token = process.env.GITHUB_ACCESS_TOKEN;
	if (!token) {
		// If no GitHub token, fall back to preferred ref or "main"
		return preferredRef || "main";
	}

	// First, try to get the default branch
	let defaultBranch = "main";
	try {
		const repoResponse = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (repoResponse.ok) {
			const repoData = (await repoResponse.json()) as { default_branch: string };
			defaultBranch = repoData.default_branch || "main";
		}
	} catch (error) {
		console.warn(`Failed to fetch default branch for ${repository}:`, error);
	}

	// If we have a preferred ref (branch name), verify it exists
	if (preferredRef && !/^[a-f0-9]{40}$/i.test(preferredRef)) {
		// It's a branch name, not a commit SHA - verify it exists
		try {
			const branchResponse = await fetch(
				`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/branches/${encodeURIComponent(preferredRef)}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}
			);

			if (branchResponse.ok) {
				// Branch exists, use it
				return preferredRef;
			}
		} catch (error) {
			console.warn(`Failed to verify branch ${preferredRef} for ${repository}:`, error);
		}
	}

	// Fall back to default branch
	return defaultBranch;
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
 * Note: Using .merge() instead of .extend() to ensure proper JSON schema generation.
 */
export const TestFailureAnalysisSchema = BaseFailureAnalysisSchema.merge(
	z.object({
		codeLocation: z
			.string()
			.nullable()
			.describe(
				"The specific code location (file:line) where the issue likely occurs, or null if not applicable"
			),
		relatedFiles: z
			.array(z.string())
			.nullable()
			.describe("Other files that might be related to this failure, or null if none"),
	})
);

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
 * Analyze a failure with images using a vision model (GPT-4o-mini).
 * This is specifically for e2e tests that have screenshots.
 *
 * Note: generateObject doesn't directly support images, so we use generateText
 * with images and then parse the JSON response according to the schema.
 */
export async function analyzeFailureWithImages<T extends z.ZodTypeAny>(options: {
	schema: T;
	prompt: string;
	images: Array<{ url: string; contentType: string }>;
	system?: string;
	temperature?: number;
}): Promise<z.infer<T>> {
	const { schema, prompt, images, system, temperature = 0.3 } = options;

	const openai = createOpenAIClient();
	const { generateText } = await import("ai");

	// Build message content with text and images
	// ImagePart format: { type: 'image', image: string | URL, mediaType?: string }
	const content: Array<
		{ type: "text"; text: string } | { type: "image"; image: string | URL; mediaType?: string }
	> = [{ type: "text", text: prompt }];

	// Add images to the content
	for (const image of images) {
		content.push({
			type: "image",
			image: image.url, // Can be a URL string or URL object
			mediaType: image.contentType, // e.g., "image/png"
		});
	}

	// Use generateText with vision model, then parse JSON response
	// Note: generateObject doesn't support vision models, so we use generateText and parse JSON
	const enhancedPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON that matches the requested schema. Do not include any markdown formatting, code blocks, or explanatory text. Return pure JSON only.`;

	const { text } = await generateText({
		model: openai("gpt-4o-mini"), // Use vision-capable model
		system:
			system ||
			"You are an expert software engineer analyzing end-to-end test failures. You can see screenshots from the test execution. Provide clear, actionable insights based on both the error messages and what you see in the screenshots. Always respond with valid JSON only, no markdown or additional text.",
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: enhancedPrompt },
					...content.filter((c) => c.type === "image"),
				],
			},
		],
		temperature,
	});

	// Parse the JSON response and validate against schema
	try {
		const parsed = JSON.parse(text);
		const validated = schema.parse(parsed);
		return validated as z.infer<T>;
	} catch (error) {
		// If parsing fails, try to extract JSON from the response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[0]);
				const validated = schema.parse(parsed);
				return validated as z.infer<T>;
			} catch {
				throw new Error(
					`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
		throw new Error(`AI response is not valid JSON: ${text.substring(0, 200)}`);
	}
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
