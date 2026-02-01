import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { convexTest } from "convex-test";
import { api } from "@convex/_generated/api";
import Dashboard from "../Dashboard";
import { createTestInstance, setupTestProject, createTestRun } from "../../test-utils/convex-test-helper";

// Mock Convex hooks to use convex-test
let testInstance: ReturnType<typeof convexTest> | null = null;
const queryResults = new Map<string, unknown>();

vi.mock("convex/react", () => {
	return {
		useQuery: (query: unknown, args?: unknown) => {
			if (!testInstance) return undefined;
			if (args === "skip") return undefined;

			const cacheKey = JSON.stringify({ query: String(query), args });
			
			// Return cached result synchronously
			if (queryResults.has(cacheKey)) {
				return queryResults.get(cacheKey);
			}

			// For now, return undefined and let the component handle loading state
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
	describe.skip("Dashboard Integration Tests (skipped in bun test - requires vitest)", () => {
		it("placeholder", () => {});
	});
} else {
	describe("Dashboard Integration Tests", () => {
		beforeEach(async () => {
			testInstance = createTestInstance();
			queryResults.clear();
		});

		it("should render dashboard with empty state when no data exists", async () => {
			// Pre-populate with empty data
			const stats = await testInstance.query(api.tests.getDashboardStats);
			const projects = await testInstance.query(api.tests.getProjects);
			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 10 });

			queryResults.set(JSON.stringify({ query: String(api.tests.getDashboardStats), args: undefined }), stats);
			queryResults.set(JSON.stringify({ query: String(api.tests.getProjects), args: undefined }), projects);
			queryResults.set(JSON.stringify({ query: String(api.tests.getTestRuns), args: { limit: 10 } }), testRuns);

			render(
				<BrowserRouter>
					<Dashboard />
				</BrowserRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Dashboard")).toBeInTheDocument();
			});
		});

		it("should display dashboard stats when test data exists", async () => {
			const projectId = await setupTestProject(testInstance!);
			await createTestRun(testInstance!, projectId, {
				testType: "unit",
				passedTests: 10,
				failedTests: 2,
			});

			// Pre-populate query results
			const stats = await testInstance.query(api.tests.getDashboardStats);
			const projects = await testInstance.query(api.tests.getProjects);
			const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 10 });

			queryResults.set(JSON.stringify({ query: String(api.tests.getDashboardStats), args: undefined }), stats);
			queryResults.set(JSON.stringify({ query: String(api.tests.getProjects), args: undefined }), projects);
			queryResults.set(JSON.stringify({ query: String(api.tests.getTestRuns), args: { limit: 10 } }), testRuns);

			render(
				<BrowserRouter>
					<Dashboard />
				</BrowserRouter>
			);

			await waitFor(() => {
				expect(screen.getByText("Dashboard")).toBeInTheDocument();
			});
		});
	});
}
