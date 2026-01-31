// Aggregates temporarily disabled to unblock - will re-enable once components are working
// import { TableAggregate } from "@convex-dev/aggregate";
import type { GenericMutationCtx } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
// import { components } from "./_generated/api";
import { api } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";

// Aggregates temporarily commented out - causing deployment issues
// Will re-enable once basic functions are working

export const ingestTestRun = mutation({
	args: {
		projectId: v.optional(v.id("projects")),
		projectName: v.string(),
		framework: v.union(
			v.literal("vitest"),
			v.literal("playwright"),
			v.literal("jest"),
			v.literal("other")
		),
		testType: v.union(
			v.literal("unit"),
			v.literal("integration"),
			v.literal("e2e"),
			v.literal("visual")
		),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		duration: v.optional(v.number()),
		totalTests: v.number(),
		passedTests: v.number(),
		failedTests: v.number(),
		skippedTests: v.number(),
		environment: v.optional(v.string()),
		ci: v.optional(v.boolean()),
		commitSha: v.optional(v.string()),
		triggeredBy: v.optional(v.string()),
		reporterVersion: v.optional(v.string()),
		tests: v.array(
			v.object({
				name: v.string(),
				file: v.string(),
				line: v.optional(v.number()),
				column: v.optional(v.number()),
				status: v.union(
					v.literal("passed"),
					v.literal("failed"),
					v.literal("skipped"),
					v.literal("running")
				),
				duration: v.number(),
				error: v.optional(v.string()),
				errorDetails: v.optional(v.string()),
				retries: v.optional(v.number()),
				suite: v.optional(v.string()),
				tags: v.optional(v.array(v.string())),
				metadata: v.optional(v.any()),
				stdout: v.optional(v.string()),
				stderr: v.optional(v.string()),
				codeSnippet: v.optional(
					v.object({
						startLine: v.number(),
						endLine: v.number(),
						content: v.string(),
						language: v.optional(v.string()),
					})
				),
				attachments: v.optional(
					v.array(
						v.object({
							name: v.string(),
							contentType: v.string(),
							storageId: v.id("_storage"),
						})
					)
				),
			})
		),
		suites: v.optional(
			v.array(
				v.object({
					name: v.string(),
					file: v.string(),
					status: v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped")),
					duration: v.number(),
					totalTests: v.number(),
					passedTests: v.number(),
					failedTests: v.number(),
					skippedTests: v.number(),
				})
			)
		),
		coverage: v.optional(
			v.object({
				summary: v.optional(
					v.object({
						lines: v.optional(v.object({ total: v.number(), covered: v.number() })),
						statements: v.optional(v.object({ total: v.number(), covered: v.number() })),
						branches: v.optional(v.object({ total: v.number(), covered: v.number() })),
						functions: v.optional(v.object({ total: v.number(), covered: v.number() })),
					})
				),
				files: v.optional(
					v.record(
						v.string(),
						v.object({
							linesCovered: v.number(),
							linesTotal: v.number(),
							lineDetails: v.optional(v.string()),
							statementDetails: v.optional(v.string()),
							statementsCovered: v.optional(v.number()),
							statementsTotal: v.optional(v.number()),
							branchesCovered: v.optional(v.number()),
							branchesTotal: v.optional(v.number()),
							functionsCovered: v.optional(v.number()),
							functionsTotal: v.optional(v.number()),
						})
					)
				),
			})
		),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		// Get or create project
		let projectId = args.projectId;
		let projectCreated = false;
		if (!projectId) {
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), args.projectName))
				.first();

			if (existingProject) {
				projectId = existingProject._id;
				await ctx.db.patch(projectId, {
					updatedAt: Date.now(),
				});
			} else {
				projectId = await ctx.db.insert("projects", {
					name: args.projectName,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				projectCreated = true;
			}
		}

		// Determine status based on test results
		const status =
			args.failedTests > 0
				? "failed"
				: args.skippedTests === args.totalTests
					? "skipped"
					: "passed";

		// Create test run
		const testRunId = await ctx.db.insert("testRuns", {
			projectId,
			framework: args.framework,
			testType: args.testType,
			status,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			duration: args.duration,
			totalTests: args.totalTests,
			passedTests: args.passedTests,
			failedTests: args.failedTests,
			skippedTests: args.skippedTests,
			environment: args.environment,
			ci: args.ci,
			commitSha: args.commitSha,
			triggeredBy: args.triggeredBy,
			reporterVersion: args.reporterVersion,
			metadata: args.metadata,
		});

		// Aggregates temporarily disabled - will re-enable once components are working
		// const testRunDoc = await ctx.db.get(testRunId);
		// if (testRunDoc) {
		// 	await testPyramidTotalAggregate.insert(ctx, testRunDoc);
		// 	await testPyramidPassedAggregate.insert(ctx, testRunDoc);
		// 	await testPyramidFailedAggregate.insert(ctx, testRunDoc);
		// }

		// Insert test suites
		if (args.suites) {
			for (const suite of args.suites) {
				await ctx.db.insert("testSuites", {
					testRunId,
					projectId,
					name: suite.name,
					file: suite.file,
					status: suite.status,
					duration: suite.duration,
					totalTests: suite.totalTests,
					passedTests: suite.passedTests,
					failedTests: suite.failedTests,
					skippedTests: suite.skippedTests,
				});
			}
		}

		// Insert individual tests
		const now = Date.now();
		for (const test of args.tests) {
			const testId = await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: test.name,
				file: test.file,
				line: test.line,
				column: test.column,
				status: test.status,
				duration: test.duration,
				error: test.error,
				errorDetails: test.errorDetails,
				retries: test.retries,
				suite: test.suite,
				tags: test.tags,
				metadata: test.metadata,
				stdout: test.stdout,
				stderr: test.stderr,
			});

			if (test.codeSnippet) {
				await ctx.db.insert("codeSnippets", {
					testId,
					file: test.file,
					startLine: test.codeSnippet.startLine,
					endLine: test.codeSnippet.endLine,
					content: test.codeSnippet.content,
					language: test.codeSnippet.language,
					fetchedAt: now,
				});
			}

			if (test.attachments) {
				for (const att of test.attachments) {
					await ctx.db.insert("testAttachments", {
						testId,
						name: att.name,
						contentType: att.contentType,
						storageId: att.storageId,
						createdAt: now,
					});
				}
			}
		}

		// Insert file coverage when provided - batch in chunks to avoid exceeding read limits
		if (args.coverage?.files && Object.keys(args.coverage.files).length > 0) {
			const coverageEntries = Object.entries(args.coverage.files);
			const COVERAGE_BATCH_SIZE = 100; // Process 100 files at a time

			for (let i = 0; i < coverageEntries.length; i += COVERAGE_BATCH_SIZE) {
				const batch = coverageEntries.slice(i, i + COVERAGE_BATCH_SIZE);
				// Insert batch atomically
				for (const [file, fileCov] of batch) {
					await ctx.db.insert("fileCoverage", {
						testRunId,
						projectId,
						file,
						linesCovered: fileCov.linesCovered,
						linesTotal: fileCov.linesTotal,
						lineDetails: fileCov.lineDetails,
						statementDetails: fileCov.statementDetails,
						statementsCovered: fileCov.statementsCovered,
						statementsTotal: fileCov.statementsTotal,
						branchesCovered: fileCov.branchesCovered,
						branchesTotal: fileCov.branchesTotal,
						functionsCovered: fileCov.functionsCovered,
						functionsTotal: fileCov.functionsTotal,
					});
				}
			}
		}

		// Update pre-computed dashboard stats (one doc read + one patch; pyramid updated per definition)
		await updateDashboardStats(ctx, {
			projectId,
			testType: args.testType,
			startedAt: args.startedAt,
			tests: args.tests,
			projectCreated,
		});

		return { testRunId, projectId };
	},
});

const COVERAGE_PER_RUN_LIMIT = 2000;

export const getCoverageForTestRun = query({
	args: {
		testRunId: v.id("testRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("fileCoverage")
			.withIndex("by_test_run", (q) => q.eq("testRunId", args.testRunId))
			.take(COVERAGE_PER_RUN_LIMIT);
	},
});

export const getFileCoverage = query({
	args: {
		file: v.string(),
	},
	handler: async (ctx, args) => {
		// Find the latest test run with coverage for this file
		const testRuns = await ctx.db
			.query("testRuns")
			.withIndex("by_started_at")
			.order("desc")
			.take(100);

		for (const run of testRuns) {
			const coverage = await ctx.db
				.query("fileCoverage")
				.withIndex("by_test_run", (q) => q.eq("testRunId", run._id))
				.filter((q) => q.eq(q.field("file"), args.file))
				.first();
			if (coverage) {
				// Also fetch project info for repository URL
				const project = await ctx.db.get(coverage.projectId);
				return {
					...coverage,
					project,
					testRun: run,
				};
			}
		}
		return null;
	},
});

// Helper function to check if a file is a test file
function isTestFilePattern(filePath: string): boolean {
	const testPatterns = [
		/\.test\.(ts|tsx|js|jsx)$/i,
		/\.spec\.(ts|tsx|js|jsx)$/i,
		/\.test\.(ts|tsx|js|jsx)\./i,
		/\.spec\.(ts|tsx|js|jsx)\./i,
	];
	return testPatterns.some((pattern) => pattern.test(filePath));
}

// Helper function to split path into segments
function splitPath(path: string): string[] {
	return path.split(/[/\\]/).filter((segment) => segment.length > 0);
}

export const getCoverageTree = query({
	args: {
		projectId: v.optional(v.id("projects")),
		useStatementCoverage: v.optional(v.boolean()),
		historicalPeriod: v.optional(v.union(v.literal("1w"), v.literal("1m"), v.literal("1y"))),
	},
	handler: async (ctx, args) => {
		const useStatementCoverage = args.useStatementCoverage ?? false;
		const historicalPeriod = args.historicalPeriod;

		// Find the latest test run with coverage
		let testRuns: Doc<"testRuns">[];
		if (args.projectId) {
			testRuns = await ctx.db
				.query("testRuns")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId as Id<"projects">))
				.order("desc")
				.take(100);
		} else {
			testRuns = await ctx.db.query("testRuns").withIndex("by_started_at").order("desc").take(100);
		}

		// Find the first test run that has coverage
		let coverageRunId: Id<"testRuns"> | undefined;
		let currentRun: Doc<"testRuns"> | undefined;
		for (const run of testRuns) {
			const coverage = await ctx.db
				.query("fileCoverage")
				.withIndex("by_test_run", (q) => q.eq("testRunId", run._id))
				.first();
			if (coverage) {
				coverageRunId = run._id;
				currentRun = run;
				break;
			}
		}

		if (!coverageRunId || !currentRun) {
			return [];
		}

		// Get historical coverage if requested
		let historicalCoverageMap: Map<string, { coverage: number }> | undefined;
		if (historicalPeriod) {
			const now = currentRun.startedAt;
			let targetTime: number;
			if (historicalPeriod === "1w") {
				targetTime = now - 7 * 24 * 60 * 60 * 1000; // 1 week ago
			} else if (historicalPeriod === "1m") {
				targetTime = now - 30 * 24 * 60 * 60 * 1000; // 1 month ago
			} else {
				targetTime = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago
			}

			// Find test runs before the target time (going backwards)
			// We'll look for runs in a window around the target time
			const windowStart =
				targetTime -
				(historicalPeriod === "1y" ? 30 : historicalPeriod === "1m" ? 7 : 3) * 24 * 60 * 60 * 1000;
			const windowEnd =
				targetTime +
				(historicalPeriod === "1y" ? 30 : historicalPeriod === "1m" ? 7 : 3) * 24 * 60 * 60 * 1000;

			let historicalRuns: Doc<"testRuns">[];
			if (args.projectId) {
				const projectId: Id<"projects"> = args.projectId; // Type narrowing
				historicalRuns = await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", projectId))
					.filter((q) =>
						q.and(q.gte(q.field("startedAt"), windowStart), q.lte(q.field("startedAt"), windowEnd))
					)
					.order("desc")
					.take(100);
			} else {
				historicalRuns = await ctx.db
					.query("testRuns")
					.withIndex("by_started_at")
					.filter((q) =>
						q.and(q.gte(q.field("startedAt"), windowStart), q.lte(q.field("startedAt"), windowEnd))
					)
					.order("desc")
					.take(100);
			}

			// Find the closest run to target time (prefer before, but allow after if needed) with coverage
			let historicalRunId: Id<"testRuns"> | undefined;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const run of historicalRuns) {
				const coverage = await ctx.db
					.query("fileCoverage")
					.withIndex("by_test_run", (q) => q.eq("testRunId", run._id))
					.first();
				if (coverage) {
					const distance = Math.abs(run.startedAt - targetTime);
					if (distance < closestDistance) {
						closestDistance = distance;
						historicalRunId = run._id;
					}
				}
			}

			if (historicalRunId) {
				const historicalCoverage = await ctx.db
					.query("fileCoverage")
					.withIndex("by_test_run", (q) => q.eq("testRunId", historicalRunId))
					.take(COVERAGE_PER_RUN_LIMIT);
				historicalCoverageMap = new Map();
				for (const fc of historicalCoverage) {
					if (isTestFilePattern(fc.file)) continue;
					const coverage = useStatementCoverage
						? fc.statementsTotal && fc.statementsTotal > 0
							? ((fc.statementsCovered ?? 0) / fc.statementsTotal) * 100
							: fc.linesTotal > 0
								? (fc.linesCovered / fc.linesTotal) * 100
								: 0
						: fc.linesTotal > 0
							? (fc.linesCovered / fc.linesTotal) * 100
							: 0;
					historicalCoverageMap.set(fc.file, { coverage });
				}
			}
		}

		// Get all coverage for this run
		const allCoverage = await ctx.db
			.query("fileCoverage")
			.withIndex("by_test_run", (q) => q.eq("testRunId", coverageRunId))
			.take(COVERAGE_PER_RUN_LIMIT);

		// Filter out test files and build tree structure
		const sourceFiles = allCoverage.filter((fc) => !isTestFilePattern(fc.file));

		// Build tree structure
		type TreeNodeEntry = {
			node: {
				name: string;
				path: string;
				type: "file" | "directory";
				linesCovered?: number;
				linesTotal?: number;
				statementsCovered?: number;
				statementsTotal?: number;
				coverage?: number;
				historicalCoverage?: { coverage: number; change: number };
				children?: unknown[];
			};
			children: Map<string, TreeNodeEntry>;
		};
		const root: Map<string, TreeNodeEntry> = new Map();

		for (const fileData of sourceFiles) {
			const segments = splitPath(fileData.file);
			if (segments.length === 0) continue;

			let current = root;
			let currentPath = "";

			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
				const isLast = i === segments.length - 1;
				const path = currentPath ? `${currentPath}/${segment}` : segment;

				if (isLast) {
					// This is a file
					if (!current.has(segment)) {
						const currentCoverage = useStatementCoverage
							? fileData.statementsTotal && fileData.statementsTotal > 0
								? ((fileData.statementsCovered ?? 0) / fileData.statementsTotal) * 100
								: fileData.linesTotal > 0
									? (fileData.linesCovered / fileData.linesTotal) * 100
									: undefined
							: fileData.linesTotal > 0
								? (fileData.linesCovered / fileData.linesTotal) * 100
								: undefined;

						const historicalCoverage = historicalCoverageMap?.get(fileData.file);
						const historicalData = historicalCoverage
							? {
									coverage: historicalCoverage.coverage,
									change:
										currentCoverage !== undefined
											? currentCoverage - historicalCoverage.coverage
											: 0,
								}
							: undefined;

						current.set(segment, {
							node: {
								name: segment,
								path: fileData.file,
								type: "file" as const,
								linesCovered: fileData.linesCovered,
								linesTotal: fileData.linesTotal,
								statementsCovered: fileData.statementsCovered,
								statementsTotal: fileData.statementsTotal,
								coverage: currentCoverage,
								historicalCoverage: historicalData,
							},
							children: new Map(),
						});
					}
				} else {
					// This is a directory
					if (!current.has(segment)) {
						current.set(segment, {
							node: {
								name: segment,
								path,
								type: "directory" as const,
								children: [],
							},
							children: new Map(),
						});
					}
					const dirEntry = current.get(segment);
					if (dirEntry) {
						current = dirEntry.children;
					}
					currentPath = path;
				}
			}
		}

		// Convert to tree structure and aggregate directory coverage
		function processNode(entry: TreeNodeEntry): TreeNodeEntry["node"] {
			const node = entry.node;
			if (node.type === "directory") {
				let totalLinesCovered = 0;
				let totalLinesTotal = 0;
				let totalStatementsCovered = 0;
				let totalStatementsTotal = 0;
				let totalCoverage = 0;
				let totalHistoricalCoverage = 0;
				let coverageCount = 0;
				let historicalCount = 0;
				const processedChildren: TreeNodeEntry["node"][] = [];

				for (const childEntry of entry.children.values()) {
					const processed = processNode(childEntry);
					processedChildren.push(processed);
					if (processed.linesCovered !== undefined) {
						totalLinesCovered += processed.linesCovered;
					}
					if (processed.linesTotal !== undefined) {
						totalLinesTotal += processed.linesTotal;
					}
					if (processed.statementsCovered !== undefined) {
						totalStatementsCovered += processed.statementsCovered;
					}
					if (processed.statementsTotal !== undefined) {
						totalStatementsTotal += processed.statementsTotal;
					}
					if (processed.coverage !== undefined) {
						totalCoverage += processed.coverage;
						coverageCount++;
					}
					if (processed.historicalCoverage) {
						totalHistoricalCoverage += processed.historicalCoverage.coverage;
						historicalCount++;
					}
				}

				// Sort children: directories first, then files, both alphabetically
				processedChildren.sort((a, b) => {
					if (a.type !== b.type) {
						return a.type === "directory" ? -1 : 1;
					}
					return a.name.localeCompare(b.name);
				});

				const currentCoverage = useStatementCoverage
					? totalStatementsTotal > 0
						? (totalStatementsCovered / totalStatementsTotal) * 100
						: totalLinesTotal > 0
							? (totalLinesCovered / totalLinesTotal) * 100
							: undefined
					: totalLinesTotal > 0
						? (totalLinesCovered / totalLinesTotal) * 100
						: undefined;

				const avgHistoricalCoverage =
					historicalCount > 0 ? totalHistoricalCoverage / historicalCount : undefined;
				const historicalData =
					currentCoverage !== undefined && avgHistoricalCoverage !== undefined
						? {
								coverage: avgHistoricalCoverage,
								change: currentCoverage - avgHistoricalCoverage,
							}
						: undefined;

				return {
					...node,
					children: processedChildren,
					linesCovered: totalLinesCovered,
					linesTotal: totalLinesTotal,
					statementsCovered: totalStatementsCovered,
					statementsTotal: totalStatementsTotal,
					coverage: currentCoverage,
					historicalCoverage: historicalData,
				};
			}
			return node;
		}

		const rootNodes: TreeNodeEntry["node"][] = Array.from(root.values()).map(processNode);
		rootNodes.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "directory" ? -1 : 1;
			}
			return a.name.localeCompare(b.name);
		});

		return rootNodes;
	},
});

export const getTestsByTestFile = query({
	args: {
		projectId: v.optional(v.id("projects")),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 1000;

		// Get all tests
		let tests: Doc<"tests">[];
		if (args.projectId) {
			tests = await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId as Id<"projects">))
				.take(limit);
		} else {
			tests = await ctx.db.query("tests").take(limit);
		}

		// Group by test file, test type, and framework
		const groups = new Map<string, Map<string, Map<string, Doc<"tests">[]>>>();

		for (const test of tests) {
			// Check if it's a test file
			if (!isTestFilePattern(test.file)) {
				continue;
			}

			// Get test run to access framework and testType
			const testRun = await ctx.db.get(test.testRunId);
			if (!testRun) continue;

			const testFile = test.file;
			const testType = testRun.testType;
			const framework = testRun.framework;

			if (!groups.has(testFile)) {
				groups.set(testFile, new Map());
			}
			const byFile = groups.get(testFile);
			if (!byFile) continue;

			if (!byFile.has(testType)) {
				byFile.set(testType, new Map());
			}
			const byType = byFile.get(testType);
			if (!byType) continue;

			if (!byType.has(framework)) {
				byType.set(framework, []);
			}
			const testsArray = byType.get(framework);
			if (testsArray) {
				testsArray.push(test);
			}
		}

		// Convert to array format
		const result: Array<{
			testFile: string;
			testType: string;
			framework: string;
			tests: Doc<"tests">[];
			passed: number;
			failed: number;
			skipped: number;
		}> = [];

		// Sort test files alphabetically
		const sortedFiles = Array.from(groups.keys()).sort();

		for (const testFile of sortedFiles) {
			const byFile = groups.get(testFile);
			if (!byFile) continue;
			// Sort test types
			const sortedTypes = Array.from(byFile.keys()).sort();
			for (const testType of sortedTypes) {
				const byType = byFile.get(testType);
				if (!byType) continue;
				// Sort frameworks
				const sortedFrameworks = Array.from(byType.keys()).sort();
				for (const framework of sortedFrameworks) {
					const tests = byType.get(framework);
					if (!tests) continue;
					const passed = tests.filter((t) => t.status === "passed").length;
					const failed = tests.filter((t) => t.status === "failed").length;
					const skipped = tests.filter((t) => t.status === "skipped").length;

					result.push({
						testFile,
						testType,
						framework,
						tests,
						passed,
						failed,
						skipped,
					});
				}
			}
		}

		return result;
	},
});

export const getTestRuns = query({
	args: {
		projectId: v.optional(v.id("projects")),
		testType: v.optional(
			v.union(v.literal("unit"), v.literal("integration"), v.literal("e2e"), v.literal("visual"))
		),
		ci: v.optional(v.boolean()),
		triggeredBy: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		let runs: Doc<"testRuns">[];
		if (args.projectId !== undefined) {
			const projectId = args.projectId;
			runs = await ctx.db
				.query("testRuns")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.order("desc")
				.take(args.limit ?? 100);
		} else {
			runs = await ctx.db
				.query("testRuns")
				.withIndex("by_started_at")
				.order("desc")
				.take(args.limit ?? 100);
		}
		let filtered = runs;
		if (args.ci !== undefined) {
			filtered = filtered.filter((r) => r.ci === args.ci);
		}
		if (args.triggeredBy !== undefined && args.triggeredBy !== "") {
			filtered = filtered.filter((r) => r.triggeredBy === args.triggeredBy);
		}
		if (args.testType !== undefined) {
			filtered = filtered.filter((r) => r.testType === args.testType);
		}
		return filtered.slice(0, args.limit || 50);
	},
});

export const getTestRun = query({
	args: {
		runId: v.id("testRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.runId);
	},
});

export const getTestRunsByCIRunId = query({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		// Query all test runs and filter by ciRunId
		// Note: This could be optimized with an index if needed
		const allRuns = await ctx.db.query("testRuns").collect();
		return allRuns.filter((run) => run.ciRunId === args.ciRunId);
	},
});

export const getTestExecution = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.testId);
	},
});

export const getTestDefinitionExecutions = query({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		file: v.string(),
		line: v.optional(v.number()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 100;
		// Get all tests for this project
		const allTests = await ctx.db
			.query("tests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.take(1000); // Reasonable limit for filtering

		// Filter by test definition (name + file + line)
		const matchingTests = allTests.filter(
			(test) =>
				test.name === args.name &&
				test.file === args.file &&
				(test.line === args.line || (args.line === undefined && test.line === undefined))
		);

		// Sort by most recent first (by testRunId which is time-ordered)
		const sorted = matchingTests.sort((a, b) => {
			// Compare by ID which is roughly chronological
			return b._id > a._id ? 1 : -1;
		});

		// Get test runs for context
		const testRuns = await Promise.all(
			sorted.slice(0, limit).map(async (test) => {
				const run = await ctx.db.get(test.testRunId);
				return { ...test, ci: run?.ci, commitSha: run?.commitSha, runStartedAt: run?.startedAt };
			})
		);

		return testRuns;
	},
});

const ATTACHMENTS_PER_TEST_LIMIT = 100;

export const getTestAttachments = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("testAttachments")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.take(ATTACHMENTS_PER_TEST_LIMIT);
	},
});

export const getTestAttachmentsWithUrls = action({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args): Promise<Array<Doc<"testAttachments"> & { url: string | null }>> => {
		const attachments: Doc<"testAttachments">[] = await ctx.runQuery(api.tests.getTestAttachments, {
			testId: args.testId,
		});
		const withUrls = await Promise.all(
			attachments.map(async (att: Doc<"testAttachments">) => {
				const url = await ctx.storage.getUrl(att.storageId);
				return { ...att, url };
			})
		);
		return withUrls;
	},
});

export const getTests = query({
	args: {
		testRunId: v.optional(v.id("testRuns")),
		projectId: v.optional(v.id("projects")),
		status: v.optional(
			v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped"), v.literal("running"))
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const defaultLimit = 1000;
		const limit = args.limit ?? defaultLimit;
		const testRunId = args.testRunId;
		const projectId = args.projectId;
		const status = args.status;

		if (testRunId !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunId))
				.take(limit);
		}
		if (projectId !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.take(limit);
		}
		if (status !== undefined) {
			return await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", status))
				.take(limit);
		}
		return await ctx.db.query("tests").take(limit);
	},
});

const SEARCH_TAKE_LIMIT = 500; // Max docs per search index to stay under read limit when merging two searches

export const getTestsPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		testRunId: v.optional(v.id("testRuns")),
		projectId: v.optional(v.id("projects")),
		status: v.optional(
			v.union(
				v.literal("passed"),
				v.literal("failed"),
				v.literal("skipped"),
				v.literal("running"),
				v.literal("all")
			)
		),
		searchQuery: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const hasSearchQuery = args.searchQuery && args.searchQuery.trim() !== "";
		const effectiveStatus = args.status === "all" ? undefined : args.status;

		// Search path: capped read then manual cursor slice (cannot use DB-level pagination for merged search)
		if (hasSearchQuery && args.searchQuery) {
			const searchTerm = args.searchQuery.trim();

			const nameResults = await ctx.db
				.query("tests")
				.withSearchIndex("search_name", (q) => {
					const baseQuery = q.search("name", searchTerm);
					if (args.projectId && effectiveStatus) {
						return baseQuery.eq("projectId", args.projectId).eq("status", effectiveStatus);
					}
					if (args.projectId) {
						return baseQuery.eq("projectId", args.projectId);
					}
					if (effectiveStatus) {
						return baseQuery.eq("status", effectiveStatus);
					}
					return baseQuery;
				})
				.take(SEARCH_TAKE_LIMIT);

			const fileResults = await ctx.db
				.query("tests")
				.withSearchIndex("search_file", (q) => {
					const baseQuery = q.search("file", searchTerm);
					if (args.projectId && effectiveStatus) {
						return baseQuery.eq("projectId", args.projectId).eq("status", effectiveStatus);
					}
					if (args.projectId) {
						return baseQuery.eq("projectId", args.projectId);
					}
					if (effectiveStatus) {
						return baseQuery.eq("status", effectiveStatus);
					}
					return baseQuery;
				})
				.take(SEARCH_TAKE_LIMIT);

			const seenIds = new Set<Id<"tests">>();
			const allTests: Doc<"tests">[] = [];
			for (const test of nameResults) {
				if (!seenIds.has(test._id)) {
					seenIds.add(test._id);
					allTests.push(test);
				}
			}
			for (const test of fileResults) {
				if (!seenIds.has(test._id)) {
					seenIds.add(test._id);
					allTests.push(test);
				}
			}

			const filterTestRunId = args.testRunId;
			if (filterTestRunId) {
				allTests.splice(
					0,
					allTests.length,
					...allTests.filter((t) => t.testRunId === filterTestRunId)
				);
			}

			allTests.sort((a, b) => (b._id > a._id ? 1 : -1));

			const { numItems, cursor } = args.paginationOpts;
			const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
			const endIndex = startIndex + numItems;
			const slice = allTests.slice(startIndex, endIndex);
			const page = await Promise.all(
				slice.map(async (test) => {
					const run = await ctx.db.get(test.testRunId);
					return { ...test, ci: run?.ci, commitSha: run?.commitSha };
				})
			);
			return {
				page,
				continueCursor: endIndex >= allTests.length ? "" : endIndex.toString(),
				isDone: endIndex >= allTests.length,
			};
		}

		// Indexed paths: use DB-level pagination to avoid reading more than numItems (+ run lookups)
		const testRunIdPag = args.testRunId;
		const projectIdPag = args.projectId;
		let paginated: { page: Doc<"tests">[]; continueCursor: string; isDone: boolean };

		if (testRunIdPag !== undefined) {
			const q = ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", testRunIdPag))
				.order("desc");
			const result = await q.paginate(args.paginationOpts);
			const filtered = effectiveStatus
				? result.page.filter((t) => t.status === effectiveStatus)
				: result.page;
			paginated = {
				page: filtered,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (projectIdPag !== undefined && effectiveStatus) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_project_and_status", (q) =>
					q.eq("projectId", projectIdPag).eq("status", effectiveStatus)
				)
				.order("desc")
				.paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (projectIdPag !== undefined) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_project", (q) => q.eq("projectId", projectIdPag))
				.order("desc")
				.paginate(args.paginationOpts);
			const filtered = effectiveStatus
				? result.page.filter((t) => t.status === effectiveStatus)
				: result.page;
			paginated = {
				page: filtered,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else if (effectiveStatus) {
			const result = await ctx.db
				.query("tests")
				.withIndex("by_status", (q) => q.eq("status", effectiveStatus))
				.order("desc")
				.paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		} else {
			const result = await ctx.db.query("tests").order("desc").paginate(args.paginationOpts);
			paginated = {
				page: result.page,
				continueCursor: result.continueCursor,
				isDone: result.isDone,
			};
		}

		const page = await Promise.all(
			paginated.page.map(async (test) => {
				const run = await ctx.db.get(test.testRunId);
				return { ...test, ci: run?.ci, commitSha: run?.commitSha };
			})
		);
		return {
			page,
			continueCursor: paginated.continueCursor,
			isDone: paginated.isDone,
		};
	},
});

const PROJECTS_LIMIT = 500;

export const getProjects = query({
	handler: async (ctx) => {
		return await ctx.db.query("projects").order("desc").take(PROJECTS_LIMIT);
	},
});

/** Pre-computed overview for dashboard (one doc read). Use this instead of loading all projects/pyramid for overview cards. */
export const getDashboardStats = query({
	handler: async (ctx) => {
		const doc = await ctx.db.query("dashboardStats").first();
		if (!doc) {
			return {
				projectCount: 0,
				testRunCount: 0,
				pyramid: ZERO_PYRAMID,
			};
		}
		return {
			projectCount: doc.projectCount,
			testRunCount: doc.testRunCount,
			pyramid: doc.pyramid,
		};
	},
});

export const updateProjectRepository = mutation({
	args: {
		projectId: v.id("projects"),
		repository: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.projectId, {
			repository: args.repository,
			updatedAt: Date.now(),
		});
		return { success: true };
	},
});

function testDefinitionKey(
	projectId: Id<"projects">,
	name: string,
	file: string,
	line: number | undefined
): string {
	return `${projectId}|${name}|${file}|${line ?? ""}`;
}

const ZERO_PYRAMID = {
	unit: { total: 0, passed: 0, failed: 0 },
	integration: { total: 0, passed: 0, failed: 0 },
	e2e: { total: 0, passed: 0, failed: 0 },
	visual: { total: 0, passed: 0, failed: 0 },
};

type PyramidType = keyof typeof ZERO_PYRAMID;
type TestStatus = "passed" | "failed" | "skipped" | "running";

async function updateDashboardStats(
	ctx: GenericMutationCtx<DataModel>,
	args: {
		projectId: Id<"projects">;
		testType: "unit" | "integration" | "e2e" | "visual";
		startedAt: number;
		tests: Array<{ name: string; file: string; line?: number; status: TestStatus }>;
		projectCreated: boolean;
	}
) {
	const now = Date.now();
	let statsDoc = await ctx.db.query("dashboardStats").first();
	if (!statsDoc) {
		const id = await ctx.db.insert("dashboardStats", {
			projectCount: 0,
			testRunCount: 0,
			pyramid: { ...ZERO_PYRAMID },
			updatedAt: now,
		});
		const created = await ctx.db.get(id);
		if (!created) throw new Error("Failed to create dashboardStats");
		statsDoc = created;
	}

	const pyramid = {
		unit: { ...statsDoc.pyramid.unit },
		integration: { ...statsDoc.pyramid.integration },
		e2e: { ...statsDoc.pyramid.e2e },
		visual: { ...statsDoc.pyramid.visual },
	};

	const projectCount = statsDoc.projectCount + (args.projectCreated ? 1 : 0);
	const testRunCount = statsDoc.testRunCount + 1;
	const typeKey = args.testType as PyramidType;

	// Batch optimization: Fetch all existing test definitions for this project/type in one query
	// instead of querying per test to avoid exceeding read limits
	// Limit to 2000 definitions to stay well under the 4096 read limit
	const MAX_DEFINITIONS_TO_FETCH = 2000;
	const existingDefinitions = await ctx.db
		.query("testDefinitionLatest")
		.withIndex("by_project_type_key", (q) =>
			q.eq("projectId", args.projectId).eq("testType", args.testType)
		)
		.take(MAX_DEFINITIONS_TO_FETCH);

	// Build map for O(1) lookups
	const existingDefinitionsMap = new Map<string, Doc<"testDefinitionLatest">>();
	for (const def of existingDefinitions) {
		existingDefinitionsMap.set(def.definitionKey, def);
	}

	// Process tests in batches to avoid too many writes
	const TEST_BATCH_SIZE = 200; // Process 200 tests at a time
	const inserts: Array<{
		projectId: Id<"projects">;
		testType: "unit" | "integration" | "e2e" | "visual";
		definitionKey: string;
		status: TestStatus;
		lastRunStartedAt: number;
	}> = [];
	const patches: Array<{
		id: Id<"testDefinitionLatest">;
		status: TestStatus;
		lastRunStartedAt: number;
		oldStatus: TestStatus;
	}> = [];

	for (const test of args.tests) {
		const definitionKey = testDefinitionKey(args.projectId, test.name, test.file, test.line);
		const existing = existingDefinitionsMap.get(definitionKey);

		if (!existing) {
			inserts.push({
				projectId: args.projectId,
				testType: args.testType,
				definitionKey,
				status: test.status,
				lastRunStartedAt: args.startedAt,
			});
			pyramid[typeKey].total += 1;
			if (test.status === "passed") pyramid[typeKey].passed += 1;
			else if (test.status === "failed") pyramid[typeKey].failed += 1;
		} else if (args.startedAt >= existing.lastRunStartedAt) {
			if (existing.status === "passed") pyramid[typeKey].passed -= 1;
			else if (existing.status === "failed") pyramid[typeKey].failed -= 1;
			patches.push({
				id: existing._id,
				status: test.status,
				lastRunStartedAt: args.startedAt,
				oldStatus: existing.status,
			});
			if (test.status === "passed") pyramid[typeKey].passed += 1;
			else if (test.status === "failed") pyramid[typeKey].failed += 1;
		}
	}

	// Execute inserts in batches (atomic per batch)
	for (let i = 0; i < inserts.length; i += TEST_BATCH_SIZE) {
		const batch = inserts.slice(i, i + TEST_BATCH_SIZE);
		for (const insert of batch) {
			await ctx.db.insert("testDefinitionLatest", insert);
		}
	}

	// Execute patches in batches (atomic per batch)
	for (let i = 0; i < patches.length; i += TEST_BATCH_SIZE) {
		const batch = patches.slice(i, i + TEST_BATCH_SIZE);
		for (const patch of batch) {
			await ctx.db.patch("testDefinitionLatest", patch.id, {
				status: patch.status,
				lastRunStartedAt: patch.lastRunStartedAt,
			});
		}
	}

	// Final atomic update to dashboard stats
	await ctx.db.patch("dashboardStats", statsDoc._id, {
		projectCount,
		testRunCount,
		pyramid,
		updatedAt: now,
	});
}

const PYRAMID_RUNS_LIMIT = 50; // Max runs to consider (newest first)
const PYRAMID_TESTS_PER_RUN_LIMIT = 500; // Max tests read per run; keeps total reads under 32k

export const getTestPyramidData = query({
	args: {
		projectId: v.optional(v.id("projects")),
	},
	handler: async (ctx, args) => {
		// Count unique test definitions per type; passed/failed from latest execution per definition.
		// Capped to stay under Convex read limit (~32k). See docs/TERMINOLOGY.md.
		const pyramidProjectId = args.projectId;
		const runsUnsorted = pyramidProjectId
			? await ctx.db
					.query("testRuns")
					.withIndex("by_project", (q) => q.eq("projectId", pyramidProjectId))
					.take(500)
			: await ctx.db.query("testRuns").withIndex("by_started_at").order("desc").take(500);
		const testRuns = runsUnsorted
			.sort((a, b) => b.startedAt - a.startedAt)
			.slice(0, PYRAMID_RUNS_LIMIT);

		const pyramid = {
			unit: { total: 0, passed: 0, failed: 0 },
			integration: { total: 0, passed: 0, failed: 0 },
			e2e: { total: 0, passed: 0, failed: 0 },
			visual: { total: 0, passed: 0, failed: 0 },
		};

		const seenByType: Record<
			keyof typeof pyramid,
			Map<string, "passed" | "failed" | "skipped" | "running">
		> = {
			unit: new Map(),
			integration: new Map(),
			e2e: new Map(),
			visual: new Map(),
		};

		for (const run of testRuns) {
			const type = run.testType;
			if (!(type in seenByType)) continue;
			const map = seenByType[type as keyof typeof seenByType];
			const tests = await ctx.db
				.query("tests")
				.withIndex("by_test_run", (q) => q.eq("testRunId", run._id))
				.take(PYRAMID_TESTS_PER_RUN_LIMIT);
			for (const test of tests) {
				const key = testDefinitionKey(test.projectId, test.name, test.file, test.line);
				if (!map.has(key)) {
					map.set(key, test.status);
				}
			}
		}

		for (const type of ["unit", "integration", "e2e", "visual"] as const) {
			const map = seenByType[type];
			pyramid[type].total = map.size;
			for (const status of map.values()) {
				if (status === "passed") pyramid[type].passed += 1;
				else if (status === "failed") pyramid[type].failed += 1;
			}
		}

		return pyramid;
	},
});

// Seed mutation to insert a sample failing test for demonstration
export const seedFailingTest = mutation({
	args: {},
	handler: async (ctx) => {
		try {
			const now = Date.now();
			console.log("Starting seed mutation...");

			// Get or create a demo project
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), "panoptes"))
				.first();

			let projectId: Id<"projects">;
			if (!existingProject) {
				console.log("Creating new project...");
				projectId = await ctx.db.insert("projects", {
					name: "panoptes",
					description: "Panoptes test visualization platform",
					createdAt: now,
					updatedAt: now,
				});
			} else {
				console.log("Updating existing project...");
				await ctx.db.patch(existingProject._id, {
					updatedAt: now,
				});
				projectId = existingProject._id;
			}

			console.log("Project ID:", projectId);

			// Create a test run with a failing test
			console.log("Creating test run...");
			const testRunId = await ctx.db.insert("testRuns", {
				projectId,
				framework: "vitest",
				testType: "unit",
				status: "failed",
				startedAt: now - 5000,
				completedAt: now,
				duration: 5000,
				totalTests: 3,
				passedTests: 2,
				failedTests: 1,
				skippedTests: 0,
				environment: "local",
				ci: false,
			});

			console.log("Test run ID:", testRunId);

			// Aggregates temporarily disabled - will re-enable once components are working
			// const testRunDoc = await ctx.db.get(testRunId);
			// if (testRunDoc) {
			// 	console.log("Updating aggregates...");
			// 	try {
			// 		await testPyramidTotalAggregate.insert(ctx, testRunDoc);
			// 		await testPyramidPassedAggregate.insert(ctx, testRunDoc);
			// 		await testPyramidFailedAggregate.insert(ctx, testRunDoc);
			// 	} catch (aggregateError) {
			// 		console.error("Error updating aggregates:", aggregateError);
			// 		// Continue even if aggregates fail
			// 	}
			// }

			// Insert the failing test
			console.log("Inserting failing test...");
			const failingTestId = await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should calculate total correctly",
				file: "convex/tests.ts",
				line: 42,
				column: 5,
				status: "failed",
				duration: 150,
				error: "AssertionError: expected 5 to equal 6",
				errorDetails: "Expected: 6\nReceived: 5\n\nat Object.<anonymous> (convex/tests.ts:42:15)",
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			console.log("Failing test ID:", failingTestId);

			// Insert passing tests
			console.log("Inserting passing tests...");
			await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should add two numbers",
				file: "convex/tests.ts",
				line: 10,
				status: "passed",
				duration: 50,
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			await ctx.db.insert("tests", {
				testRunId,
				projectId,
				name: "should subtract two numbers",
				file: "convex/tests.ts",
				line: 20,
				status: "passed",
				duration: 45,
				suite: "Calculator",
				tags: ["unit", "math"],
			});

			console.log("Seed mutation completed successfully");
			return { testRunId, projectId, failingTestId };
		} catch (error) {
			console.error("Error in seedFailingTest mutation:", error);
			throw error;
		}
	},
});

/**
 * Seed historical coverage data for testing the 1W/1M/1Y comparison feature.
 * Creates test runs at 1 week, 1 month, and 1 year ago with coverage data.
 */
export const seedHistoricalCoverage = mutation({
	args: {
		projectId: v.optional(v.id("projects")),
		projectName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Get or create project
		let projectId = args.projectId;
		if (!projectId) {
			const projectName = args.projectName || "Panoptes";
			const existingProject = await ctx.db
				.query("projects")
				.filter((q) => q.eq(q.field("name"), projectName))
				.first();

			if (existingProject) {
				projectId = existingProject._id;
			} else {
				projectId = await ctx.db.insert("projects", {
					name: projectName,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			}
		}

		const now = Date.now();
		const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
		const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
		const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

		// Sample files with different coverage scenarios
		const sampleFiles = [
			{
				file: "src/utils.ts",
				linesTotal: 100,
				linesCovered: 60,
				statementsTotal: 85,
				statementsCovered: 55,
			},
			{
				file: "src/api/client.ts",
				linesTotal: 150,
				linesCovered: 120,
				statementsTotal: 130,
				statementsCovered: 110,
			},
			{
				file: "src/components/Button.tsx",
				linesTotal: 50,
				linesCovered: 45,
				statementsTotal: 40,
				statementsCovered: 38,
			},
			{
				file: "src/components/Card.tsx",
				linesTotal: 80,
				linesCovered: 70,
				statementsTotal: 65,
				statementsCovered: 60,
			},
			{
				file: "src/pages/Dashboard.tsx",
				linesTotal: 200,
				linesCovered: 150,
				statementsTotal: 180,
				statementsCovered: 140,
			},
			{
				file: "src/lib/helpers.ts",
				linesTotal: 120,
				linesCovered: 90,
				statementsTotal: 100,
				statementsCovered: 80,
			},
			{
				file: "packages/shared/src/types.ts",
				linesTotal: 300,
				linesCovered: 280,
				statementsTotal: 250,
				statementsCovered: 240,
			},
			{
				file: "packages/shared/src/utils.ts",
				linesTotal: 75,
				linesCovered: 60,
				statementsTotal: 65,
				statementsCovered: 55,
			},
		];

		// Historical periods with different coverage percentages (showing improvement over time)
		const periods = [
			{
				name: "1 year ago",
				startedAt: oneYearAgo,
				multiplier: 0.6, // Lower coverage (60% of current)
			},
			{
				name: "1 month ago",
				startedAt: oneMonthAgo,
				multiplier: 0.8, // Medium coverage (80% of current)
			},
			{
				name: "1 week ago",
				startedAt: oneWeekAgo,
				multiplier: 0.95, // High coverage (95% of current)
			},
		];

		const createdRuns: Id<"testRuns">[] = [];

		for (const period of periods) {
			// Create test run
			const testRunId = await ctx.db.insert("testRuns", {
				projectId,
				framework: "vitest",
				testType: "unit",
				status: "passed",
				startedAt: period.startedAt,
				completedAt: period.startedAt + 5000,
				duration: 5000,
				totalTests: 50,
				passedTests: 48,
				failedTests: 0,
				skippedTests: 2,
				ci: true,
				commitSha: `seed-${period.startedAt}`,
			});

			createdRuns.push(testRunId);

			// Create coverage data for each file
			for (const fileData of sampleFiles) {
				const linesCovered = Math.round(fileData.linesCovered * period.multiplier);
				const statementsCovered = Math.round(fileData.statementsCovered * period.multiplier);

				// Generate line details
				const coveredLines: number[] = [];
				const uncoveredLines: number[] = [];
				for (let i = 1; i <= fileData.linesTotal; i++) {
					if (i <= linesCovered) {
						coveredLines.push(i);
					} else {
						uncoveredLines.push(i);
					}
				}

				// Generate statement details
				const statements: Array<{
					id: string;
					startLine: number;
					endLine: number;
					covered: boolean;
				}> = [];
				const statementsPerLine = Math.ceil(fileData.statementsTotal / fileData.linesTotal);
				let statementId = 0;
				for (let line = 1; line <= fileData.linesTotal; line++) {
					const statementsOnLine =
						line === fileData.linesTotal
							? fileData.statementsTotal - statementId
							: statementsPerLine;
					for (let s = 0; s < statementsOnLine && statementId < fileData.statementsTotal; s++) {
						statements.push({
							id: String(statementId),
							startLine: line,
							endLine: line,
							covered: statementId < statementsCovered,
						});
						statementId++;
					}
				}

				await ctx.db.insert("fileCoverage", {
					testRunId,
					projectId,
					file: fileData.file,
					linesCovered,
					linesTotal: fileData.linesTotal,
					lineDetails: JSON.stringify({
						covered: coveredLines,
						uncovered: uncoveredLines,
					}),
					statementDetails: JSON.stringify(statements),
					statementsCovered,
					statementsTotal: fileData.statementsTotal,
					branchesCovered: Math.round(fileData.statementsCovered * 0.7 * period.multiplier),
					branchesTotal: Math.round(fileData.statementsTotal * 0.8),
					functionsCovered: Math.round(fileData.statementsCovered * 0.9 * period.multiplier),
					functionsTotal: Math.round(fileData.statementsTotal * 0.9),
				});
			}
		}

		return {
			success: true,
			projectId,
			createdRuns: createdRuns.length,
			message: `Created ${createdRuns.length} historical test runs with coverage data`,
		};
	},
});

export const getTestSuggestions = query({
	args: {
		file: v.string(),
		projectId: v.id("projects"),
		commitSha: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const commitSha = args.commitSha || "latest";
		const cached = await ctx.db
			.query("testSuggestions")
			.withIndex("by_file_commit", (q) => q.eq("file", args.file).eq("commitSha", commitSha))
			.first();
		return cached;
	},
});
