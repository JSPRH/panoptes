import { Elysia, t } from "elysia";
import { TestRunIngestSchema } from "./model";
import { TestServiceImpl } from "./service";

const convexUrl = process.env.CONVEX_URL || "";
const testService = new TestServiceImpl(convexUrl);

export default new Elysia({ prefix: "/tests" })
	.post(
		"/ingest",
		async ({ body }) => {
			try {
				const result = await testService.ingestTestRun(body);
				if (!result.success) {
					return {
						success: false,
						error: result.error || "Failed to ingest test run",
					};
				}
				return {
					success: true,
					testRunId: result.testRunId,
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			body: TestRunIngestSchema,
			detail: {
				tags: ["tests"],
				summary: "Ingest test results",
				description: "Accepts test results from reporters and stores them",
			},
		},
	)
	.get(
		"/",
		() => {
			// TODO: Query tests from Convex
			return {
				tests: [],
				total: 0,
			};
		},
		{
			detail: {
				tags: ["tests"],
				summary: "Query tests",
				description: "Query tests with filters",
			},
			query: t.Object({
				projectId: t.Optional(t.String()),
				testType: t.Optional(t.String()),
				status: t.Optional(t.String()),
				limit: t.Optional(t.Number()),
			}),
		},
	);
