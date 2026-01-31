import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
	path: "/ingestTestRunHttp",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const data = (await request.json()) as {
			projectId?: string;
			projectName: string;
			framework: "vitest" | "playwright" | "jest" | "other";
			testType: "unit" | "integration" | "e2e" | "visual";
			startedAt: number;
			completedAt?: number;
			duration?: number;
			totalTests: number;
			passedTests: number;
			failedTests: number;
			skippedTests: number;
			environment?: string;
			ci?: boolean;
			commitSha?: string;
			tests: Array<{
				name: string;
				file: string;
				line?: number;
				column?: number;
				status: "passed" | "failed" | "skipped" | "running";
				duration: number;
				error?: string;
				errorDetails?: string;
				retries?: number;
				suite?: string;
				tags?: string[];
				metadata?: unknown;
			}>;
			suites?: Array<{
				name: string;
				file: string;
				status: "passed" | "failed" | "skipped";
				duration: number;
				totalTests: number;
				passedTests: number;
				failedTests: number;
				skippedTests: number;
			}>;
			metadata?: unknown;
		};

		// Validate and call the mutation
		const result = await ctx.runMutation(api.tests.ingestTestRun, {
			projectId: data.projectId as Id<"projects"> | undefined,
			projectName: data.projectName,
			framework: data.framework,
			testType: data.testType,
			startedAt: data.startedAt,
			completedAt: data.completedAt,
			duration: data.duration,
			totalTests: data.totalTests,
			passedTests: data.passedTests,
			failedTests: data.failedTests,
			skippedTests: data.skippedTests,
			environment: data.environment,
			ci: data.ci,
			commitSha: data.commitSha,
			tests: data.tests,
			suites: data.suites,
			metadata: data.metadata,
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}),
});

export default http;
