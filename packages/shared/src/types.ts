import { z } from "zod";

export const TestFrameworkSchema = z.enum([
	"vitest",
	"playwright",
	"jest",
	"other",
]);
export const TestTypeSchema = z.enum(["unit", "integration", "e2e", "visual"]);
export const TestStatusSchema = z.enum([
	"passed",
	"failed",
	"skipped",
	"running",
]);

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
			}),
		)
		.optional(),
	metadata: z.record(z.any()).optional(),
});

export type TestRunIngest = z.infer<typeof TestRunIngestSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type TestFramework = z.infer<typeof TestFrameworkSchema>;
export type TestType = z.infer<typeof TestTypeSchema>;
export type TestStatus = z.infer<typeof TestStatusSchema>;
