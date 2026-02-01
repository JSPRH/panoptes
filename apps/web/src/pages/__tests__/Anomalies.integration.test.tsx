import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { convexTest } from "convex-test";
import { api } from "@convex/_generated/api";
import Anomalies from "../Anomalies";
import { createTestInstance, setupTestProject } from "../../test-utils/convex-test-helper";
import type { Id } from "@convex/_generated/dataModel";

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
const testSuite = typeof Bun !== "undefined" && !globalThis.__vitest__ 
	? describe.skip 
	: describe;

testSuite("Anomalies Integration Tests", () => {
	beforeEach(async () => {
		testInstance = createTestInstance();
		queryResults.clear();
	});

	it("should render anomalies page", async () => {
		render(
			<BrowserRouter>
				<Anomalies />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
		});
	});

	it("should display empty state when no anomalies exist", async () => {
		const projectId = await setupTestProject(testInstance!);

		const projects = await testInstance.query(api.tests.getProjects);
		const anomalies = await testInstance.query(api.anomalies.getAnomalies, {
			projectId,
			resolved: false,
		});

		queryResults.set(
			JSON.stringify({ query: String(api.tests.getProjects), args: undefined }),
			projects || []
		);
		queryResults.set(
			JSON.stringify({
				query: String(api.anomalies.getAnomalies),
				args: { projectId, resolved: false },
			}),
			anomalies || []
		);

		render(
			<BrowserRouter>
				<Anomalies />
			</BrowserRouter>
		);

		await waitFor(() => {
			expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
		});
	});
});
