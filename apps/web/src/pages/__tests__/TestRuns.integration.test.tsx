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

vi.mock("convex/react", () => {
	return {
		useQuery: (query: unknown, args?: unknown) => {
			if (!testInstance) return undefined;
			if (args === "skip") return undefined;

			const cacheKey = JSON.stringify({ query: String(query), args });

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
		render(
			<BrowserRouter>
				<TestRuns />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Test Runs/i)).toBeInTheDocument();
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

		queryResults.set(
			JSON.stringify({ query: String(api.tests.getProjects), args: undefined }),
			projects || []
		);
		queryResults.set(
			JSON.stringify({ query: String(api.tests.getTestRuns), args: { limit: 100 } }),
			testRuns || []
		);

		render(
			<BrowserRouter>
				<TestRuns />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText(/Test Runs/i)).toBeInTheDocument();
		});
	});
});
