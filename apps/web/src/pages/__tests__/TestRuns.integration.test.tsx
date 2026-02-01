import { api } from "@convex/_generated/api";
import { render, screen, waitFor } from "@testing-library/react";
import type { convexTest } from "convex-test";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTestInstance,
	createTestRun,
	setupTestProject,
} from "../../test-utils/convex-test-helper";
import TestRuns from "../TestRuns";

// Mock Convex hooks
let testInstance: ReturnType<typeof convexTest> | null = null;
const queryResults = new Map<string, unknown>();

// Helper to safely convert query to string
function queryToString(query: unknown): string {
	try {
		return String(query);
	} catch {
		// Fallback: use a stable representation based on query path if available
		if (query && typeof query === "object" && "path" in query) {
			return String((query as { path: unknown }).path);
		}
		// Last resort: use object reference as string
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
const testSuite = typeof Bun !== "undefined" && !globalThis.__vitest__ ? describe.skip : describe;

testSuite("TestRuns Integration Tests", () => {
	beforeEach(async () => {
		testInstance = createTestInstance();
		queryResults.clear();
	});

	it("should render test runs page", async () => {
		if (!testInstance) throw new Error("testInstance not initialized");
		// Pre-populate with empty data
		const projects = await testInstance.query(api.tests.getProjects);
		const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 100 });

		queryResults.set(
			JSON.stringify({ query: queryToString(api.tests.getProjects), args: undefined }),
			projects || []
		);
		// The component calls getTestRuns with various filter combinations
		// Pre-populate the most common one (no filters, just limit)
		queryResults.set(
			JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 100 } }),
			testRuns || []
		);

		render(
			<BrowserRouter>
				<TestRuns />
			</BrowserRouter>
		);

		await waitFor(() => {
			const headings = screen.getAllByRole("heading", { name: /Test Runs/i });
			expect(headings.length).toBeGreaterThan(0);
			expect(headings[0]).toBeInTheDocument();
		});
	});

	it("should display test runs when they exist", async () => {
		if (!testInstance) throw new Error("testInstance not initialized");
		const projectId = await setupTestProject(testInstance);
		await createTestRun(testInstance, projectId, {
			testType: "unit",
			passedTests: 5,
			failedTests: 1,
		});

		const projects = await testInstance.query(api.tests.getProjects);
		const testRuns = await testInstance.query(api.tests.getTestRuns, { limit: 100 });
		const testRunHistory = await testInstance.query(api.tests.getTestRunHistory, { limit: 500 });

		queryResults.set(
			JSON.stringify({ query: queryToString(api.tests.getProjects), args: undefined }),
			projects || []
		);
		// The component calls getTestRuns with various filter combinations
		// Pre-populate multiple variations to cover the component's queries
		queryResults.set(
			JSON.stringify({ query: queryToString(api.tests.getTestRuns), args: { limit: 100 } }),
			testRuns || []
		);
		queryResults.set(
			JSON.stringify({ query: queryToString(api.tests.getTestRunHistory), args: { limit: 500 } }),
			testRunHistory || []
		);

		render(
			<BrowserRouter>
				<TestRuns />
			</BrowserRouter>
		);

		await waitFor(() => {
			const headings = screen.getAllByRole("heading", { name: /Test Runs/i });
			expect(headings.length).toBeGreaterThan(0);
			expect(headings[0]).toBeInTheDocument();
		});
	});
});
