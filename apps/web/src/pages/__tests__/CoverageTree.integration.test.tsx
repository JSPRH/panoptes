import { api } from "@convex/_generated/api";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { convexTest } from "convex-test";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTestInstance,
	setupTestProject,
} from "../../test-utils/convex-test-helper";
import CoverageTreePage from "../CoverageTree";

// Mock Convex hooks to use convex-test
let testInstance: ReturnType<typeof convexTest> | null = null;
const queryResults = new Map<string, unknown>();

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
		useAction: () => vi.fn(),
		ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		ConvexReactClient: class {},
	};
});

// Skip these tests when running with bun test - they require vitest/jsdom
// @ts-ignore
if (typeof Bun !== "undefined" && !globalThis.__vitest__) {
	describe.skip("CoverageTree Integration Tests (skipped in bun test - requires vitest)", () => {
		it("placeholder", () => {});
	});
} else {
	describe("CoverageTreePage Integration Tests", () => {
		beforeEach(async () => {
			testInstance = createTestInstance();
			queryResults.clear();
		});

		describe("Empty State", () => {
			it("should render empty state when no coverage data exists", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});
				const coverageHistory = await testInstance.query(api.tests.getCoverageHistory, {
					projectId,
					limit: 100,
					useStatementCoverage: false,
				});
				const packageCoverage = await testInstance.query(api.tests.getCoverageByPackage, {
					projectId,
					limit: 100,
					useStatementCoverage: false,
					maxPackages: 8,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					coverageHistory || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					packageCoverage || []
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(screen.getByText("Coverage Tree")).toBeInTheDocument();
				});

				await waitFor(() => {
					expect(
						screen.getByText("No coverage data available")
					).toBeInTheDocument();
				});
			});

			it("should show correct empty state description", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(
						screen.getByText(
							"Run your tests with coverage enabled to see code coverage organized by directory structure here."
						)
					).toBeInTheDocument();
				});
			});
		});

		describe("Page Header", () => {
			it("should render page header with correct title", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(screen.getByText("Coverage Tree")).toBeInTheDocument();
				});
			});

			it("should update description when statement coverage is enabled", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(
						screen.getByText("Lines of Code coverage organized by packages and directories")
					).toBeInTheDocument();
				});

				// Toggle statement coverage
				const switchElement = screen.getByLabelText("Statement Coverage");
				fireEvent.click(switchElement);

				await waitFor(() => {
					expect(
						screen.getByText("Statement coverage organized by packages and directories")
					).toBeInTheDocument();
				});
			});
		});

		describe("Statement Coverage Toggle", () => {
			it("should toggle statement coverage switch", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					const switchElement = screen.getByLabelText("Statement Coverage");
					expect(switchElement).toBeInTheDocument();
					expect(switchElement).not.toBeChecked();
				});

				const switchElement = screen.getByLabelText("Statement Coverage");
				fireEvent.click(switchElement);

				await waitFor(() => {
					expect(switchElement).toBeChecked();
				});
			});
		});

		describe("Historical Period Selection", () => {
			it("should render historical period buttons", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(screen.getByText("1w")).toBeInTheDocument();
					expect(screen.getByText("1m")).toBeInTheDocument();
					expect(screen.getByText("1y")).toBeInTheDocument();
				});
			});

			it("should toggle historical period on button click", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					[]
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					const button1w = screen.getByText("1w");
					expect(button1w).toBeInTheDocument();
					fireEvent.click(button1w);
				});

				// Click again to toggle off
				await waitFor(() => {
					const button1w = screen.getByText("1w");
					fireEvent.click(button1w);
				});
			});
		});

		describe("Coverage Trend Chart", () => {
			it("should render trend chart when coverage history exists", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});
				const coverageHistory = [
					{
						date: Date.now() - 86400000,
						linesCoverage: 80,
						statementsCoverage: 75,
						branchesCoverage: 70,
						functionsCoverage: 85,
						overallCoverage: 77.5,
					},
					{
						date: Date.now(),
						linesCoverage: 85,
						statementsCoverage: 80,
						branchesCoverage: 75,
						functionsCoverage: 90,
						overallCoverage: 82.5,
					},
				];

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					coverageHistory
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(screen.getByText("Coverage Trend Over Time")).toBeInTheDocument();
				});
			});

			it("should toggle show all metrics checkbox", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");
				const projectId = await setupTestProject(testInstance);

				const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 1 });
				const treeData = await testInstance.query(api.tests.getCoverageTree, {
					projectId,
					useStatementCoverage: false,
					historicalPeriod: undefined,
				});
				const coverageHistory = [
					{
						date: Date.now(),
						linesCoverage: 80,
						statementsCoverage: 75,
						branchesCoverage: 70,
						functionsCoverage: 85,
						overallCoverage: 77.5,
					},
				];

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					testRuns
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageTree),
						args: { projectId, useStatementCoverage: false, historicalPeriod: undefined },
					}),
					treeData || []
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageHistory),
						args: { projectId, limit: 100, useStatementCoverage: false },
					}),
					coverageHistory
				);
				queryResults.set(
					JSON.stringify({
						query: queryToString(api.tests.getCoverageByPackage),
						args: { projectId, limit: 100, useStatementCoverage: false, maxPackages: 8 },
					}),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					const checkbox = screen.getByLabelText(/Show all metrics/i);
					expect(checkbox).toBeInTheDocument();
					expect(checkbox).not.toBeChecked();
				});

				const checkbox = screen.getByLabelText(/Show all metrics/i);
				fireEvent.click(checkbox);

				await waitFor(() => {
					expect(checkbox).toBeChecked();
				});
			});
		});

		describe("Loading States", () => {
			it("should handle loading state when projectId is not available", async () => {
				if (!testInstance) throw new Error("testInstance not initialized");

				queryResults.set(
					JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 1 } }),
					[]
				);

				render(
					<BrowserRouter>
						<CoverageTreePage />
					</BrowserRouter>
				);

				await waitFor(() => {
					expect(screen.getByText("Coverage Tree")).toBeInTheDocument();
				});
			});
		});
	});
}
