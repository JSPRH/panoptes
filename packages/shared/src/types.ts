import { z } from "zod";

export const TestFrameworkSchema = z.enum(["vitest", "playwright", "jest", "other"]);
export const TestTypeSchema = z.enum(["unit", "integration", "e2e", "visual"]);
export const TestStatusSchema = z.enum(["passed", "failed", "skipped", "running"]);

export const CodeSnippetSchema = z.object({
	startLine: z.number(),
	endLine: z.number(),
	content: z.string(),
	language: z.string().optional(),
});

export const TestAttachmentIngestSchema = z.object({
	name: z.string(),
	contentType: z.string(),
	storageId: z.string().optional(),
	bodyBase64: z.string().optional(),
});

export const TestResultSchema = z.object({
	name: z.string(),
	file: z.string(),
	line: z.number().optional(),
	column: z.number().optional(),
	status: TestStatusSchema,
	duration: z.number(),
	error: z.string().optional(),
	errorDetails: z.string().optional(),
	retries: z.number().optional(),
	suite: z.string().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.any()).optional(),
	stdout: z.string().optional(),
	stderr: z.string().optional(),
	codeSnippet: CodeSnippetSchema.optional(),
	attachments: z.array(TestAttachmentIngestSchema).optional(),
});

export const CoverageSummarySchema = z.object({
	lines: z.object({ total: z.number(), covered: z.number() }).optional(),
	statements: z.object({ total: z.number(), covered: z.number() }).optional(),
	branches: z.object({ total: z.number(), covered: z.number() }).optional(),
	functions: z.object({ total: z.number(), covered: z.number() }).optional(),
});

export const FileCoverageSchema = z.object({
	linesCovered: z.number(),
	linesTotal: z.number(),
	lineDetails: z.string().optional(), // JSON: covered/uncovered line numbers
	statementDetails: z.string().optional(), // JSON: array of statement coverage info
	statementsCovered: z.number().optional(),
	statementsTotal: z.number().optional(),
	branchesCovered: z.number().optional(),
	branchesTotal: z.number().optional(),
	functionsCovered: z.number().optional(),
	functionsTotal: z.number().optional(),
});

export const CoverageIngestSchema = z.object({
	summary: CoverageSummarySchema.optional(),
	files: z.record(z.string(), FileCoverageSchema).optional(),
});

export const TestRunIngestSchema = z.object({
	projectId: z.string().optional(),
	projectName: z.string(),
	framework: TestFrameworkSchema,
	testType: TestTypeSchema,
	startedAt: z.number(),
	completedAt: z.number().optional(),
	duration: z.number().optional(),
	totalTests: z.number(),
	passedTests: z.number(),
	failedTests: z.number(),
	skippedTests: z.number(),
	environment: z.string().optional(),
	ci: z.boolean().optional(),
	commitSha: z.string().optional(),
	triggeredBy: z.string().optional(),
	reporterVersion: z.string().optional(),
	tests: z.array(TestResultSchema),
	suites: z
		.array(
			z.object({
				name: z.string(),
				file: z.string(),
				status: TestStatusSchema,
				duration: z.number(),
				totalTests: z.number(),
				passedTests: z.number(),
				failedTests: z.number(),
				skippedTests: z.number(),
			})
		)
		.optional(),
	coverage: CoverageIngestSchema.optional(),
	metadata: z.record(z.any()).optional(),
});

export type TestRunIngest = z.infer<typeof TestRunIngestSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type TestFramework = z.infer<typeof TestFrameworkSchema>;
export type TestType = z.infer<typeof TestTypeSchema>;
export type TestStatus = z.infer<typeof TestStatusSchema>;
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
export type TestAttachmentIngest = z.infer<typeof TestAttachmentIngestSchema>;
export type CoverageSummary = z.infer<typeof CoverageSummarySchema>;
export type FileCoverage = z.infer<typeof FileCoverageSchema>;
export type CoverageIngest = z.infer<typeof CoverageIngestSchema>;
