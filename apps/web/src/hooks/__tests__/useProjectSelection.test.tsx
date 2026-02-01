import type { Id } from "@convex/_generated/dataModel";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectSelection } from "../useProjectSelection";

// Mock Convex
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (query: unknown, args?: unknown) => mockUseQuery(query, args),
}));

vi.mock("@convex/_generated/api.js", () => ({
	api: {
		tests: {
			getProjects: Symbol("api.tests.getProjects"),
		},
	},
}));

describe("useProjectSelection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with null selectedProjectId", () => {
		mockUseQuery.mockReturnValue(undefined);

		const { result } = renderHook(() => useProjectSelection());

		expect(result.current.selectedProjectId).toBeNull();
		expect(result.current.selectedProject).toBeUndefined();
		expect(result.current.projects).toBeUndefined();
	});

	it("should auto-select first project when projects are loaded", async () => {
		const projects = [
			{ _id: "project-1" as Id<"projects">, name: "Project 1" },
			{ _id: "project-2" as Id<"projects">, name: "Project 2" },
		];
		mockUseQuery.mockReturnValue(projects);

		const { result } = renderHook(() => useProjectSelection());

		await waitFor(() => {
			expect(result.current.selectedProjectId).toBe("project-1");
		});

		expect(result.current.selectedProject).toEqual(projects[0]);
		expect(result.current.projects).toEqual(projects);
	});

	it("should not auto-select if projectId is already set", () => {
		const projects = [
			{ _id: "project-1" as Id<"projects">, name: "Project 1" },
			{ _id: "project-2" as Id<"projects">, name: "Project 2" },
		];
		mockUseQuery.mockReturnValue(projects);

		const { result, rerender } = renderHook(() => useProjectSelection());

		// Manually set project
		result.current.setSelectedProjectId("project-2" as Id<"projects">);
		rerender();

		expect(result.current.selectedProjectId).toBe("project-2");
		expect(result.current.selectedProject).toEqual(projects[1]);
	});

	it("should handle empty projects array", () => {
		mockUseQuery.mockReturnValue([]);

		const { result } = renderHook(() => useProjectSelection());

		expect(result.current.selectedProjectId).toBeNull();
		expect(result.current.selectedProject).toBeUndefined();
		expect(result.current.projects).toEqual([]);
	});

	it("should allow manual project selection", () => {
		const projects = [
			{ _id: "project-1" as Id<"projects">, name: "Project 1" },
			{ _id: "project-2" as Id<"projects">, name: "Project 2" },
			{ _id: "project-3" as Id<"projects">, name: "Project 3" },
		];
		mockUseQuery.mockReturnValue(projects);

		const { result, rerender } = renderHook(() => useProjectSelection());

		// Wait for auto-selection
		waitFor(() => {
			expect(result.current.selectedProjectId).toBe("project-1");
		});

		// Manually change selection
		result.current.setSelectedProjectId("project-3" as Id<"projects">);
		rerender();

		expect(result.current.selectedProjectId).toBe("project-3");
		expect(result.current.selectedProject).toEqual(projects[2]);
	});

	it("should handle setting projectId to null", async () => {
		const projects = [{ _id: "project-1" as Id<"projects">, name: "Project 1" }];
		mockUseQuery.mockReturnValue(projects);

		const { result, rerender } = renderHook(() => useProjectSelection());

		// Wait for auto-selection
		await waitFor(() => {
			expect(result.current.selectedProjectId).toBe("project-1");
		});

		// Set to null - but useEffect will auto-select again since projects exist
		result.current.setSelectedProjectId(null);
		rerender();

		// The hook will auto-select the first project again
		await waitFor(() => {
			expect(result.current.selectedProjectId).toBe("project-1");
		});
	});

	it("should update selectedProject when projects change", async () => {
		const projects1 = [{ _id: "project-1" as Id<"projects">, name: "Project 1" }];
		mockUseQuery.mockReturnValue(projects1);

		const { result, rerender } = renderHook(() => useProjectSelection());

		await waitFor(() => {
			expect(result.current.selectedProjectId).toBe("project-1");
		});

		// Update projects
		const projects2 = [
			{ _id: "project-1" as Id<"projects">, name: "Project 1 Updated" },
			{ _id: "project-2" as Id<"projects">, name: "Project 2" },
		];
		mockUseQuery.mockReturnValue(projects2);
		rerender();

		expect(result.current.selectedProject?.name).toBe("Project 1 Updated");
	});

	it("should handle selectedProjectId not found in projects", () => {
		const projects = [{ _id: "project-1" as Id<"projects">, name: "Project 1" }];
		mockUseQuery.mockReturnValue(projects);

		const { result, rerender } = renderHook(() => useProjectSelection());

		// Set to a project ID that doesn't exist
		result.current.setSelectedProjectId("non-existent" as Id<"projects">);
		rerender();

		expect(result.current.selectedProjectId).toBe("non-existent");
		expect(result.current.selectedProject).toBeUndefined();
	});
});
