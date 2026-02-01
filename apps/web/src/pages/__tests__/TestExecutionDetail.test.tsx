import { api } from "@convex/_generated/api";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { convexTest } from "convex-test";
import type { Id } from "@convex/_generated/dataModel";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTestInstance,
	createTestRun,
	setupTestProject,
} from "../../test-utils/convex-test-helper";
import TestExecutionDetail from "../TestExecutionDetail";

// Mock Convex hooks to use convex-test
let testInstance: ReturnType<typeof convexTest> | null = null;
const queryResults = new Map<string, unknown>();
const actionResults = new Map<string, unknown>();

// Helper to safely convert query to string
function queryToString(query: unknown): string {
	try {
		return String(query);
	} catch {
		if (query && typeof query === "object" && "path" in query) {
			return String((query as { path: unknown }).path);
		}
		return `[Query:${Object.prototype.toString.call(query)}]`;
	}
}

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", {
	writable: true,
	value: mockWindowOpen,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
	writable: true,
	value: {
		writeText: vi.fn(),
	},
});

vi.mock("convex/react", () => {
	return {
		useQuery: (query: unknown, args?: unknown) => {
			if (!testInstance) return undefined;
			if (args === "skip") return undefined;

			const cacheKey = JSON.stringify({ query: queryToString(query), args });

			if (queryResults.has(cacheKey)) {
				return queryResults.get(cacheKey);
			}

			return undefined;
		},
		useMutation: () => vi.fn(),
		useAction: (action: unknown) => {
			const actionKey = queryToString(action);
			return async (args?: unknown) => {
				if (actionResults.has(actionKey)) {
					const mockAction = actionResults.get(actionKey) as (args?: unknown) => unknown;
					return mockAction(args);
				}
				return vi.fn()(args);
			};
		},
		ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		ConvexReactClient: class {},
	};
});

// Skip these tests when running with bun test - they require vitest/jsdom
// @ts-ignore
const testSuite = typeof Bun !== "undefined" && !globalThis.__vitest__ ? describe.skip : describe;

testSuite("TestExecutionDetail", () => {
	beforeEach(async () => {
		testInstance = createTestInstance();
		queryResults.clear();
		actionResults.clear();
		mockWindowOpen.mockClear();
		vi.clearAllMocks();
	});

	describe("Edge Cases", () => {
		it("should render empty state when executionId is undefined", () => {
			render(
				<MemoryRouter initialEntries={["/executions"]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			expect(screen.getByText("No execution selected")).toBeInTheDocument();
			expect(screen.getByText(/Use a valid execution link/)).toBeInTheDocument();
		});

		it("should render loading state when execution is undefined", () => {
			render(
				<MemoryRouter initialEntries={["/executions/test123"]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			expect(screen.getByText("Loading…")).toBeInTheDocument();
		});

		it("should render empty state when execution is null", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const executionId = "test123" as Id<"tests">;
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				null
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Execution not found")).toBeInTheDocument();
			});
		});
	});

	describe("Test Status Rendering", () => {
		it("should render passed test execution", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const testRunId = await createTestRun(testInstance, projectId, {
				testType: "unit",
				passedTests: 1,
				failedTests: 0,
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			// Set up query results
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Execution Summary")).toBeInTheDocument();
			});

			expect(screen.getByText("passed")).toBeInTheDocument();
		});

		it("should render failed test execution with error details", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "failing.test.ts",
						status: "failed",
						duration: 50,
						error: "Test assertion failed",
						errorDetails: "Expected: true\nActual: false",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("failed")).toBeInTheDocument();
			});

			expect(screen.getByText("Error")).toBeInTheDocument();
			expect(screen.getByText("Test assertion failed")).toBeInTheDocument();
			expect(screen.getByText(/Expected: true/)).toBeInTheDocument();
		});

		it("should render running test execution", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				totalTests: 1,
				passedTests: 0,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Running Test",
						file: "running.test.ts",
						status: "running",
						duration: undefined,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("running")).toBeInTheDocument();
			});
		});

		it("should render skipped test execution", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 0,
				skippedTests: 1,
				tests: [
					{
						name: "Skipped Test",
						file: "skipped.test.ts",
						status: "skipped",
						duration: 0,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("skipped")).toBeInTheDocument();
			});
		});
	});

	describe("Duration Formatting", () => {
		it("should format duration in milliseconds", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Quick Test",
						file: "quick.test.ts",
						status: "passed",
						duration: 50,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("50ms")).toBeInTheDocument();
			});
		});

		it("should format duration in seconds", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Slow Test",
						file: "slow.test.ts",
						status: "passed",
						duration: 2500,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("2.5s")).toBeInTheDocument();
			});
		});

		it("should display dash when duration is undefined", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "No Duration Test",
						file: "noduration.test.ts",
						status: "passed",
						duration: undefined,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("—")).toBeInTheDocument();
			});
		});
	});

	describe("Test Metadata", () => {
		it("should display suite, tags, and retries when present", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Metadata",
						file: "metadata.test.ts",
						status: "passed",
						duration: 100,
						suite: "My Test Suite",
						tags: ["integration", "slow"],
						retries: 2,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText(/Suite: My Test Suite/)).toBeInTheDocument();
				expect(screen.getByText("integration")).toBeInTheDocument();
				expect(screen.getByText("slow")).toBeInTheDocument();
				expect(screen.getByText("2 retries")).toBeInTheDocument();
			});
		});
	});

	describe("AI Analysis", () => {
		it("should show analyze button for failed tests", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "failing.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// No analysis yet
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				null
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Explain with AI")).toBeInTheDocument();
			});
		});

		it("should show loading state when analyzing", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "failing.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Analysis is pending
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				{
					_id: "analysis123" as Id<"testFailureAnalysis">,
					_testId: executionId,
					status: "pending",
					confidence: "medium",
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Analyzing test failure with AI...")).toBeInTheDocument();
			});
		});

		it("should display completed analysis", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "failing.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
						line: 42,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			const project = projects?.find((p) => p._id === projectId);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Completed analysis
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				{
					_id: "analysis123" as Id<"testFailureAnalysis">,
					_testId: executionId,
					status: "completed",
					confidence: "high",
					summary: "The test is failing because of a null pointer exception",
					rootCause: "The function is being called with undefined parameters",
					suggestedFix: "Add null checks before accessing properties",
					codeLocation: "src/utils.ts:42",
					relatedFiles: ["src/helper.ts"],
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("AI Analysis")).toBeInTheDocument();
				expect(screen.getByText("high")).toBeInTheDocument();
				expect(screen.getByText(/The test is failing because/)).toBeInTheDocument();
				expect(screen.getByText(/The function is being called/)).toBeInTheDocument();
				expect(screen.getByText(/Add null checks/)).toBeInTheDocument();
			});
		});

		it("should handle analysis error", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "failing.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				null
			);

			// Mock action to throw error
			actionResults.set(
				queryToString(api.testFailureAnalysisActions.analyzeTestFailure),
				async () => {
					throw new Error("OPENAI_API_KEY is not configured");
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Explain with AI")).toBeInTheDocument();
			});

			const analyzeButton = screen.getByText("Explain with AI");
			await userEvent.click(analyzeButton);

			await waitFor(() => {
				expect(
					screen.getByText(/OPENAI_API_KEY is not configured/)
				).toBeInTheDocument();
			});
		});
	});

	describe("Code Snippet", () => {
		it("should display code snippet when available", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Code",
						file: "src/test.test.ts",
						status: "passed",
						duration: 100,
						line: 10,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			const project = projects?.find((p) => p._id === projectId);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Mock code snippet
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.github.getCodeSnippetForTest),
					args: { testId: executionId },
				}),
				{
					content: "function test() {\n  expect(true).toBe(true);\n}",
					language: "typescript",
					startLine: 8,
					endLine: 12,
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText(/Code: src\/test\.test\.ts/)).toBeInTheDocument();
			});
		});
	});

	describe("Attachments", () => {
		it("should display image attachments", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "visual",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Visual Test",
						file: "visual.test.ts",
						status: "passed",
						duration: 100,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Mock attachments action
			actionResults.set(
				queryToString(api.tests.getTestAttachmentsWithUrls),
				async () => [
					{
						_id: "att1" as Id<"testAttachments">,
						name: "screenshot.png",
						contentType: "image/png",
						url: "https://example.com/screenshot.png",
					},
				]
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Attachments")).toBeInTheDocument();
			});

			const img = screen.getByAltText("screenshot.png");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "https://example.com/screenshot.png");
		});

		it("should display non-image attachments as links", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Attachment",
						file: "test.test.ts",
						status: "passed",
						duration: 100,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Mock attachments action
			actionResults.set(
				queryToString(api.tests.getTestAttachmentsWithUrls),
				async () => [
					{
						_id: "att1" as Id<"testAttachments">,
						name: "log.txt",
						contentType: "text/plain",
						url: "https://example.com/log.txt",
					},
				]
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				const link = screen.getByText("log.txt");
				expect(link).toBeInTheDocument();
				expect(link).toHaveAttribute("href", "https://example.com/log.txt");
			});
		});

		it("should handle attachment fetch errors gracefully", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test",
						file: "test.test.ts",
						status: "passed",
						duration: 100,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			// Mock attachments action to throw error
			actionResults.set(
				queryToString(api.tests.getTestAttachmentsWithUrls),
				async () => {
					throw new Error("Failed to fetch attachments");
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Execution Summary")).toBeInTheDocument();
			});

			// Should not show attachments section
			expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
		});
	});

	describe("Stdout and Stderr", () => {
		it("should display stdout when present", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Output",
						file: "test.test.ts",
						status: "passed",
						duration: 100,
						stdout: "Test output line 1\nTest output line 2",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Stdout")).toBeInTheDocument();
				expect(screen.getByText(/Test output line 1/)).toBeInTheDocument();
			});
		});

		it("should display stderr when present", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Error Output",
						file: "test.test.ts",
						status: "failed",
						duration: 100,
						error: "Test failed",
						stderr: "Error: Something went wrong\n  at test.test.ts:10",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Stderr")).toBeInTheDocument();
				expect(screen.getByText(/Error: Something went wrong/)).toBeInTheDocument();
			});
		});
	});

	describe("Metadata Display", () => {
		it("should display metadata when present", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Metadata",
						file: "test.test.ts",
						status: "passed",
						duration: 100,
						metadata: {
							browser: "chrome",
							version: "120.0",
							os: "linux",
						},
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Metadata")).toBeInTheDocument();
				expect(screen.getByText(/"browser":\s*"chrome"/)).toBeInTheDocument();
			});
		});
	});

	describe("Navigation Links", () => {
		it("should display breadcrumb navigation", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const testRunId = await createTestRun(testInstance, projectId, {
				testType: "unit",
				passedTests: 1,
				failedTests: 0,
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Test Runs")).toBeInTheDocument();
				expect(screen.getByText("Run Details")).toBeInTheDocument();
			});
		});

		it("should link to test definition page", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "My Test",
						file: "src/test.test.ts",
						status: "passed",
						duration: 100,
						line: 42,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				const link = screen.getByText("View All Executions →");
				expect(link).toBeInTheDocument();
				expect(link.closest("a")).toHaveAttribute(
					"href",
					expect.stringContaining("/tests/")
				);
			});
		});
	});

	describe("Cursor Deeplink Generation", () => {
		it("should open Cursor prompt when analysis is available", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "src/test.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
						line: 42,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				{
					_id: "analysis123" as Id<"testFailureAnalysis">,
					_testId: executionId,
					status: "completed",
					confidence: "high",
					summary: "Test summary",
					rootCause: "Root cause",
					suggestedFix: "Suggested fix",
				}
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("💬 Open Prompt in Cursor")).toBeInTheDocument();
			});

			const button = screen.getByText("💬 Open Prompt in Cursor");
			await userEvent.click(button);

			await waitFor(() => {
				expect(mockWindowOpen).toHaveBeenCalledWith(
					expect.stringContaining("https://cursor.com/link/prompt"),
					"_blank"
				);
			});
		});

		it("should open Cursor prompt without analysis when analysis is not available", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "src/test.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
						errorDetails: "Error details",
						line: 42,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				null
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("💬 Open Prompt in Cursor")).toBeInTheDocument();
			});

			const button = screen.getByText("💬 Open Prompt in Cursor");
			await userEvent.click(button);

			await waitFor(() => {
				expect(mockWindowOpen).toHaveBeenCalledWith(
					expect.stringContaining("https://cursor.com/link/prompt"),
					"_blank"
				);
			});
		});
	});

	describe("Cloud Agent Integration", () => {
		it("should trigger cloud agent when repository is available", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "src/test.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			const project = projects?.find((p) => p._id === projectId);
			// Ensure project has repository
			if (project) {
				project.repository = "https://github.com/owner/repo";
			}
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				null
			);

			// Mock cloud agent action
			actionResults.set(
				queryToString(api.testFailureAnalysisActions.triggerCloudAgentForTest),
				async () => ({
					agentUrl: "https://example.com/agent",
					prUrl: "https://github.com/owner/repo/pull/123",
				})
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("🚀 Launch Agent")).toBeInTheDocument();
			});
		});

		it("should not show cloud agent button when repository is not available", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Failing Test",
						file: "src/test.test.ts",
						status: "failed",
						duration: 50,
						error: "Test failed",
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			const project = projects?.find((p) => p._id === projectId);
			// Ensure project does not have repository
			if (project) {
				project.repository = undefined;
			}
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.testFailureAnalysis.getTestFailureAnalysis),
					args: { testId: executionId },
				}),
				null
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("💬 Open Prompt in Cursor")).toBeInTheDocument();
			});

			// Cloud agent button should not be present
			expect(screen.queryByText("🚀 Launch Agent")).not.toBeInTheDocument();
		});
	});

	describe("Boundary Conditions", () => {
		it("should handle very long error messages", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const longError = "Error: " + "x".repeat(10000);
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 0,
				failedTests: 1,
				skippedTests: 0,
				tests: [
					{
						name: "Test with Long Error",
						file: "test.test.ts",
						status: "failed",
						duration: 50,
						error: longError,
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Error")).toBeInTheDocument();
			});

			// Should render without crashing
			const errorPre = screen.getByText(/Error:/);
			expect(errorPre).toBeInTheDocument();
		});

		it("should handle missing optional fields gracefully", async () => {
			if (!testInstance) throw new Error("testInstance not initialized");

			const projectId = await setupTestProject(testInstance);
			const now = Date.now();
			const testRunId = await testInstance.mutation(api.tests.ingestTestRun, {
				projectId,
				projectName: "Test Project",
				framework: "vitest",
				testType: "unit",
				startedAt: now,
				completedAt: now + 1000,
				duration: 1000,
				totalTests: 1,
				passedTests: 1,
				failedTests: 0,
				skippedTests: 0,
				tests: [
					{
						name: "Minimal Test",
						file: "test.test.ts",
						status: "passed",
						// No duration, suite, tags, retries, etc.
					},
				],
			});

			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
			const execution = testRuns?.[0]?.tests?.[0];
			if (!execution) throw new Error("No execution found");

			const executionId = execution._id;

			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestExecution),
					args: { testId: executionId },
				}),
				execution
			);

			const testRun = await testInstance.query(api.tests.getTestRun, {
				runId: testRunId,
			});
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getTestRun),
					args: { runId: testRunId },
				}),
				testRun
			);

			const projects = await testInstance.query(api.tests.getProjects);
			queryResults.set(
				JSON.stringify({
					query: queryToString(api.tests.getProjects),
					args: undefined,
				}),
				projects
			);

			render(
				<MemoryRouter initialEntries={[`/executions/${executionId}`]}>
					<TestExecutionDetail />
				</MemoryRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Execution Summary")).toBeInTheDocument();
			});

			// Should render without crashing
			expect(screen.getByText("passed")).toBeInTheDocument();
		});
	});
});
