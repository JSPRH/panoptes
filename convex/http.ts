import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const MAX_ATTACHMENT_BASE64_BYTES = 1 * 1024 * 1024; // 1 MB

function base64ToBlob(base64: string, contentType: string): Blob {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: contentType });
}

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
			triggeredBy?: string;
			reporterVersion?: string;
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
				stdout?: string;
				stderr?: string;
				codeSnippet?: {
					startLine: number;
					endLine: number;
					content: string;
					language?: string;
				};
				attachments?: Array<{
					name: string;
					contentType: string;
					storageId?: string;
					bodyBase64?: string;
				}>;
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
			coverage?: {
				summary?: {
					lines?: { total: number; covered: number };
					statements?: { total: number; covered: number };
					branches?: { total: number; covered: number };
					functions?: { total: number; covered: number };
				};
				files?: Record<
					string,
					{
						linesCovered: number;
						linesTotal: number;
						lineDetails?: string;
						statementDetails?: string;
						statementsCovered?: number;
						statementsTotal?: number;
						branchesCovered?: number;
						branchesTotal?: number;
						functionsCovered?: number;
						functionsTotal?: number;
					}
				>;
			};
			metadata?: unknown;
		};

		// Process attachments: store bodyBase64 in Convex storage, replace with storageId
		const normalizedTests = await Promise.all(
			data.tests.map(async (test) => {
				const attachments = test.attachments;
				if (!attachments?.length) {
					return {
						...test,
						attachments: undefined as
							| Array<{ name: string; contentType: string; storageId: Id<"_storage"> }>
							| undefined,
					};
				}
				const normalizedAttachments: Array<{
					name: string;
					contentType: string;
					storageId: Id<"_storage">;
				}> = [];
				for (const att of attachments) {
					if (att.storageId) {
						normalizedAttachments.push({
							name: att.name,
							contentType: att.contentType,
							storageId: att.storageId as Id<"_storage">,
						});
						continue;
					}
					if (att.bodyBase64) {
						const sizeBytes = (att.bodyBase64.length * 3) / 4;
						if (sizeBytes > MAX_ATTACHMENT_BASE64_BYTES) continue;
						try {
							const blob = base64ToBlob(att.bodyBase64, att.contentType);
							const storageId = await ctx.storage.store(blob);
							normalizedAttachments.push({
								name: att.name,
								contentType: att.contentType,
								storageId,
							});
						} catch {
							// Skip attachment on store failure
						}
					}
				}
				return {
					...test,
					attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
				};
			})
		);

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
			triggeredBy: data.triggeredBy,
			reporterVersion: data.reporterVersion,
			tests: normalizedTests,
			suites: data.suites,
			coverage: data.coverage,
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
