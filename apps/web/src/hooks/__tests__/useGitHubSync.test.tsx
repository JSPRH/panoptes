import type { Id } from "@convex/_generated/dataModel";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGitHubSync } from "../useGitHubSync";

// Mock Convex
const mockUseAction = vi.fn();
const mockSyncAction = vi.fn();

vi.mock("convex/react", () => ({
	useAction: (action: unknown) => mockUseAction(action),
}));

vi.mock("@convex/_generated/api.js", () => ({
	api: {
		github: {
			syncProjectGitHubData: Symbol("api.github.syncProjectGitHubData"),
		},
	},
}));

describe("useGitHubSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAction.mockReturnValue(mockSyncAction);
		// Mock alert
		global.alert = vi.fn();
	});

	it("should return handleSync function", () => {
		const { result } = renderHook(() =>
			useGitHubSync({ projectId: "project-1" as Id<"projects"> })
		);
		expect(result.current.handleSync).toBeDefined();
		expect(typeof result.current.handleSync).toBe("function");
	});

	it("should not sync when projectId is null", async () => {
		const { result } = renderHook(() => useGitHubSync({ projectId: null }));
		await result.current.handleSync();
		expect(mockSyncAction).not.toHaveBeenCalled();
	});

	it("should call sync action with projectId", async () => {
		const projectId = "project-1" as Id<"projects">;
		mockSyncAction.mockResolvedValue({
			ciRunsCount: 10,
			prsCount: 5,
		});

		const { result } = renderHook(() => useGitHubSync({ projectId }));
		await result.current.handleSync();

		expect(mockSyncAction).toHaveBeenCalledWith({ projectId });
		expect(global.alert).toHaveBeenCalledWith(
			"GitHub data synced successfully! Stored 10 CI runs and 5 PRs."
		);
	});

	it("should handle partial success with warnings", async () => {
		const projectId = "project-1" as Id<"projects">;
		mockSyncAction.mockResolvedValue({
			partialSuccess: true,
			warnings: ["Warning 1", "Warning 2"],
			ciRunsCount: 5,
			prsCount: 3,
		});

		const { result } = renderHook(() => useGitHubSync({ projectId }));
		await result.current.handleSync();

		expect(global.alert).toHaveBeenCalledWith(
			"Partially synced: 5 CI runs, 3 PRs.\n\nWarnings:\nWarning 1\nWarning 2"
		);
	});

	it("should handle errors", async () => {
		const projectId = "project-1" as Id<"projects">;
		const error = new Error("Sync failed");
		mockSyncAction.mockRejectedValue(error);
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const { result } = renderHook(() => useGitHubSync({ projectId }));
		await result.current.handleSync();

		expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to sync GitHub data:", error);
		expect(global.alert).toHaveBeenCalledWith("Failed to sync: Sync failed");
		consoleErrorSpy.mockRestore();
	});

	it("should call onRepositoryNotConfigured when repository not configured", async () => {
		const projectId = "project-1" as Id<"projects">;
		const onRepositoryNotConfigured = vi.fn();
		const error = new Error("repository not configured");
		mockSyncAction.mockRejectedValue(error);

		const { result } = renderHook(() => useGitHubSync({ projectId, onRepositoryNotConfigured }));
		await result.current.handleSync();

		expect(onRepositoryNotConfigured).toHaveBeenCalled();
		expect(global.alert).toHaveBeenCalledWith("Failed to sync: repository not configured");
	});

	it("should handle non-Error exceptions", async () => {
		const projectId = "project-1" as Id<"projects">;
		mockSyncAction.mockRejectedValue("String error");
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const { result } = renderHook(() => useGitHubSync({ projectId }));
		await result.current.handleSync();

		expect(global.alert).toHaveBeenCalledWith("Failed to sync: String error");
		consoleErrorSpy.mockRestore();
	});

	it("should handle zero counts", async () => {
		const projectId = "project-1" as Id<"projects">;
		mockSyncAction.mockResolvedValue({
			ciRunsCount: 0,
			prsCount: 0,
		});

		const { result } = renderHook(() => useGitHubSync({ projectId }));
		await result.current.handleSync();

		expect(global.alert).toHaveBeenCalledWith(
			"GitHub data synced successfully! Stored 0 CI runs and 0 PRs."
		);
	});
});
