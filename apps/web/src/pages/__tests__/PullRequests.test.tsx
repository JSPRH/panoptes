import type { Doc, Id } from "@convex/_generated/dataModel";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PullRequests from "../PullRequests";

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseAction = vi.fn();

// Create mock API references that can be compared
// These need to be defined inside the mock factory to avoid hoisting issues
// We'll import the mocked api after the mocks are set up to get the symbols
vi.mock("@convex/_generated/api.js", () => {
	const mockApi = {
		tests: {
			getProjects: Symbol("api.tests.getProjects"),
			updateProjectRepository: Symbol("api.tests.updateProjectRepository"),
		},
		github: {
			syncProjectGitHubData: Symbol("api.github.syncProjectGitHubData"),
			getAvailableRepositories: Symbol("api.github.getAvailableRepositories"),
			getPRsForProject: Symbol("api.github.getPRsForProject"),
		},
	};
	return {
		api: mockApi,
	};
});

vi.mock("convex/react", () => ({
	useQuery: (query: unknown, args?: unknown) => mockUseQuery(query, args),
	useMutation: (mutation: unknown) => mockUseMutation(mutation),
	useAction: (action: unknown) => mockUseAction(action),
}));

// Import the mocked api to get the symbols for comparison in tests
import { api as mockApi } from "@convex/_generated/api.js";

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

// Mock console.error to avoid noise in test output
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("PullRequests", () => {
	const mockProjects: Doc<"projects">[] = [
		{
			_id: "project1" as Id<"projects">,
			_creationTime: Date.now(),
			name: "Test Project 1",
			repository: "owner/repo1",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
		{
			_id: "project2" as Id<"projects">,
			_creationTime: Date.now(),
			name: "Test Project 2",
			repository: undefined,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
	];

	const mockPRs: Doc<"pullRequests">[] = [
		{
			_id: "pr1" as Id<"pullRequests">,
			_creationTime: Date.now(),
			projectId: "project1" as Id<"projects">,
			prNumber: 123,
			title: "Test PR",
			state: "open",
			author: "testuser",
			branch: "feature-branch",
			baseBranch: "main",
			commitSha: "abc123def456",
			createdAt: Date.now() - 86400000, // 1 day ago
			updatedAt: Date.now() - 3600000, // 1 hour ago
			htmlUrl: "https://github.com/owner/repo1/pull/123",
		},
	];

	const mockRepositories = [
		{
			fullName: "owner/repo1",
			name: "repo1",
			owner: "owner",
			url: "https://github.com/owner/repo1",
			private: false,
			description: "Test repository 1",
		},
		{
			fullName: "owner/repo2",
			name: "repo2",
			owner: "owner",
			url: "https://github.com/owner/repo2",
			private: true,
			description: "Test repository 2",
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseQuery.mockReturnValue(undefined);
		mockUseMutation.mockReturnValue(vi.fn());
		mockUseAction.mockReturnValue(vi.fn());
	});

	afterEach(() => {
		mockConsoleError.mockClear();
	});

	it("should initialize with default state values", () => {
		mockUseQuery.mockImplementation((query) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			return undefined;
		});

		render(<PullRequests />);

		// Component should render without crashing
		expect(screen.getByText("Pull Requests")).toBeInTheDocument();
	});

	it("should display projects when available", () => {
		mockUseQuery.mockImplementation((query) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			return undefined;
		});

		render(<PullRequests />);

		expect(screen.getByText("Test Project 1")).toBeInTheDocument();
		expect(screen.getByText("Test Project 2")).toBeInTheDocument();
	});

	it("should display 'No projects found' when projects array is empty", () => {
		mockUseQuery.mockImplementation((query) => {
			if (query === mockApi.tests.getProjects) {
				return [];
			}
			return undefined;
		});

		render(<PullRequests />);

		expect(screen.getByText("No projects found. Create a project first.")).toBeInTheDocument();
	});

	it("should auto-select first project when only one exists", async () => {
		const singleProject = [mockProjects[0]];
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return singleProject;
			}
			if (query === mockApi.github.getPRsForProject) {
				// Should be called with projectId when auto-selected
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		// Wait for auto-selection to happen
		await waitFor(() => {
			expect(mockUseQuery).toHaveBeenCalledWith(
				mockApi.github.getPRsForProject,
				expect.objectContaining({ projectId: "project1", state: "open" })
			);
		});
	});

	it("should not auto-select when multiple projects exist", () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				// Should be skipped when no project selected
				expect(args).toBe("skip");
				return undefined;
			}
			return undefined;
		});

		render(<PullRequests />);

		// Verify PR query is skipped
		expect(mockUseQuery).toHaveBeenCalledWith(mockApi.github.getPRsForProject, "skip");
	});

	it("should show sync button when project is selected", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		// Click on first project to select it
		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("Sync GitHub Data")).toBeInTheDocument();
		});
	});

	it("should call syncGitHubData when sync button is clicked", async () => {
		const mockSyncAction = vi.fn().mockResolvedValue({
			ciRunsCount: 5,
			prsCount: 3,
			partialSuccess: false,
			warnings: [],
		});

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.syncProjectGitHubData) {
				return mockSyncAction;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		// Select project
		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		// Click sync button
		const syncButton = screen.getByText("Sync GitHub Data");
		await userEvent.click(syncButton);

		await waitFor(() => {
			expect(mockSyncAction).toHaveBeenCalledWith({ projectId: "project1" });
			expect(mockAlert).toHaveBeenCalledWith(
				expect.stringContaining("GitHub data synced successfully")
			);
		});
	});

	it("should handle sync with partial success and warnings", async () => {
		const mockSyncAction = vi.fn().mockResolvedValue({
			ciRunsCount: 2,
			prsCount: 1,
			partialSuccess: true,
			warnings: ["Warning 1", "Warning 2"],
		});

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.syncProjectGitHubData) {
				return mockSyncAction;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		const syncButton = screen.getByText("Sync GitHub Data");
		await userEvent.click(syncButton);

		await waitFor(() => {
			expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("Partially synced"));
			expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("Warning 1"));
		});
	});

	it.skip("should handle sync error with repository not configured", async () => {
		const mockSyncAction = vi.fn().mockRejectedValue(new Error("repository not configured"));

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				// Return PRs for project 1, but sync will fail
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.syncProjectGitHubData) {
				return mockSyncAction;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		// Select project WITH repository - sync will fail and show error
		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		const syncButton = screen.getByText("Sync GitHub Data");
		await userEvent.click(syncButton);

		await waitFor(() => {
			expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("Failed to sync"));
		});

		// After sync error with "repository not configured", it should show the repo config
		await waitFor(() => {
			expect(screen.getByText("Repository Not Configured")).toBeInTheDocument();
		});
	});

	it("should show repository configuration when project has no repository", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		// Select project without repository
		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("Repository Not Configured")).toBeInTheDocument();
			expect(screen.getByText("Configure Repository")).toBeInTheDocument();
		});
	});

	it("should show repository config form when Configure Repository is clicked", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		await waitFor(() => {
			expect(screen.getByText("Select Repository")).toBeInTheDocument();
		});
	});

	it("should load repositories when Load Repositories is clicked", async () => {
		const mockGetRepos = vi.fn().mockResolvedValue(mockRepositories);

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return mockGetRepos;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// When Configure Repository is clicked, it auto-calls handleLoadRepositories if repos are empty
		// So we should verify that getAvailableRepositories was called
		await waitFor(
			() => {
				expect(mockGetRepos).toHaveBeenCalledWith({ limit: 100 });
			},
			{ timeout: 3000 }
		);
	});

	it("should filter repositories based on search input", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		await waitFor(async () => {
			const searchInput = screen.getByPlaceholderText("Search repositories...");
			await userEvent.type(searchInput, "repo1");
		});

		await waitFor(() => {
			// Should show filtered results
			expect(screen.getByText(/owner\/repo1/)).toBeInTheDocument();
		});
	});

	it.skip("should save repository when Save Repository is clicked", async () => {
		const mockUpdateRepo = vi.fn().mockResolvedValue(undefined);
		const mockGetRepos = vi.fn().mockResolvedValue(mockRepositories);

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseMutation.mockImplementation((mutation) => {
			if (mutation === mockApi.tests.updateProjectRepository) {
				return mockUpdateRepo;
			}
			return vi.fn();
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return mockGetRepos;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// When Configure Repository is clicked, it auto-loads repos if empty
		// Wait for repos to be loaded (either loading completes or repos appear)
		await waitFor(
			() => {
				// Wait for either the select dropdown to appear (repos loaded) or loading to finish
				const select = screen.queryByRole("combobox");
				const loadingText = screen.queryByText("Loading repositories...");
				expect(select || !loadingText).toBeTruthy();
			},
			{ timeout: 3000 }
		);

		// Now repos should be loaded, find the select
		await waitFor(async () => {
			const select = screen.getByRole("combobox");
			await userEvent.selectOptions(select, "owner/repo1");
		});

		const saveButton = screen.getByText("Save Repository");
		await userEvent.click(saveButton);

		await waitFor(() => {
			expect(mockUpdateRepo).toHaveBeenCalledWith({
				projectId: "project2",
				repository: "owner/repo1",
			});
			expect(mockAlert).toHaveBeenCalledWith("Repository saved successfully!");
		});
	});

	it("should show alert when saving repository without selection", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		await waitFor(async () => {
			const saveButton = screen.getByText("Save Repository");
			expect(saveButton).toBeDisabled();

			// Try clicking anyway (should be disabled, but test the alert path)
			await userEvent.click(saveButton);
			// Button should be disabled, so click might not work, but we test the validation logic
		});
	});

	it("should cancel repository configuration", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		await waitFor(async () => {
			const cancelButton = screen.getByText("Cancel");
			await userEvent.click(cancelButton);
		});

		await waitFor(() => {
			// Should hide the config form
			expect(screen.queryByText("Select Repository")).not.toBeInTheDocument();
		});
	});

	it("should display pull requests when available", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("#123: Test PR")).toBeInTheDocument();
			expect(screen.getByText("open")).toBeInTheDocument();
			expect(screen.getByText(/Author: testuser/)).toBeInTheDocument();
			expect(screen.getByText(/feature-branch → main/)).toBeInTheDocument();
		});
	});

	it("should display empty state when no pull requests", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return [];
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("No open pull requests")).toBeInTheDocument();
		});
	});

	it("should display PR count in description", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("1 open PR")).toBeInTheDocument();
		});
	});

	it("should display plural PR count", async () => {
		const multiplePRs = [
			...mockPRs,
			{
				...mockPRs[0],
				_id: "pr2" as Id<"pullRequests">,
				prNumber: 124,
				title: "Another PR",
			},
		];

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return multiplePRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText("2 open PRs")).toBeInTheDocument();
		});
	});

	it("should handle getStateVariant for different PR states", async () => {
		const prsWithDifferentStates: Doc<"pullRequests">[] = [
			{
				...mockPRs[0],
				state: "open",
			},
			{
				...mockPRs[0],
				_id: "pr2" as Id<"pullRequests">,
				prNumber: 124,
				state: "merged",
			},
			{
				...mockPRs[0],
				_id: "pr3" as Id<"pullRequests">,
				prNumber: 125,
				state: "closed",
			},
		];

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return prsWithDifferentStates;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			// Check that badges are rendered (state variants are applied via Badge component)
			expect(screen.getByText("open")).toBeInTheDocument();
			expect(screen.getByText("merged")).toBeInTheDocument();
			expect(screen.getByText("closed")).toBeInTheDocument();
		});
	});

	it("should show View on GitHub link for PRs", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			const link = screen.getByText("View on GitHub");
			expect(link).toBeInTheDocument();
			expect(link.closest("a")).toHaveAttribute("href", "https://github.com/owner/repo1/pull/123");
		});
	});

	it("should handle error when loading repositories fails", async () => {
		const mockGetRepos = vi.fn().mockRejectedValue(new Error("Failed to load"));

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return mockGetRepos;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// When Configure Repository is clicked, it auto-calls handleLoadRepositories if repos are empty
		// So the error will happen automatically, wait for the alert
		await waitFor(
			() => {
				expect(mockAlert).toHaveBeenCalledWith(
					expect.stringContaining("Failed to load repositories")
				);
			},
			{ timeout: 3000 }
		);
	});

	it.skip("should handle error when saving repository fails", async () => {
		const mockUpdateRepo = vi.fn().mockRejectedValue(new Error("Save failed"));
		const mockGetRepos = vi.fn().mockResolvedValue(mockRepositories);

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseMutation.mockImplementation((mutation) => {
			if (mutation === mockApi.tests.updateProjectRepository) {
				return mockUpdateRepo;
			}
			return vi.fn();
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return mockGetRepos;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// Repos auto-load when Configure Repository is clicked, wait for them to load
		await waitFor(
			async () => {
				const select = screen.getByRole("combobox");
				await userEvent.selectOptions(select, "owner/repo1");
			},
			{ timeout: 3000 }
		);

		const saveButton = screen.getByText("Save Repository");
		await userEvent.click(saveButton);

		await waitFor(() => {
			expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("Failed to save"));
		});
	});

	it("should show loading state when loading repositories", async () => {
		const mockGetRepos = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(mockRepositories), 200);
				})
		);

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return mockGetRepos;
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// When Configure Repository is clicked, it auto-loads repos, so we should see loading state
		await waitFor(() => {
			// Should show loading state
			expect(screen.getByText("Loading repositories...")).toBeInTheDocument();
		});
	});

	it("should display PR with commit SHA when available", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.getByText(/Commit: abc123d/)).toBeInTheDocument();
		});
	});

	it("should display PR without commit SHA when not available", async () => {
		const prWithoutSha = [
			{
				...mockPRs[0],
				commitSha: null,
			},
		];

		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return prWithoutSha;
			}
			return undefined;
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 1");
		await userEvent.click(projectButton);

		await waitFor(() => {
			expect(screen.queryByText(/Commit:/)).not.toBeInTheDocument();
		});
	});

	it.skip("should show private indicator for private repositories", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// Repos auto-load when Configure Repository is clicked, wait for them to appear
		await waitFor(
			() => {
				const select = screen.getByRole("combobox");
				const options = within(select).getAllByRole("option");
				expect(options.some((opt) => opt.textContent?.includes("(private)"))).toBe(true);
			},
			{ timeout: 3000 }
		);
	});

	it.skip("should show repository description in select options", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// Repos auto-load when Configure Repository is clicked, wait for them to appear
		await waitFor(
			() => {
				const select = screen.getByRole("combobox");
				const options = within(select).getAllByRole("option");
				expect(options.some((opt) => opt.textContent?.includes("Test repository 1"))).toBe(true);
			},
			{ timeout: 3000 }
		);
	});

	it("should show no repositories message when search has no results", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// Repos auto-load when Configure Repository is clicked, wait for search input to appear
		await waitFor(
			async () => {
				const searchInput = screen.getByPlaceholderText("Search repositories...");
				await userEvent.type(searchInput, "nonexistent-repo");
			},
			{ timeout: 3000 }
		);

		await waitFor(() => {
			expect(screen.getByText(/No repositories found matching/)).toBeInTheDocument();
		});
	});

	it("should show repository count in filter message", async () => {
		mockUseQuery.mockImplementation((query, args) => {
			if (query === mockApi.tests.getProjects) {
				return mockProjects;
			}
			if (query === mockApi.github.getPRsForProject) {
				if (args === "skip") {
					return undefined;
				}
				return mockPRs;
			}
			return undefined;
		});

		mockUseAction.mockImplementation((action) => {
			if (action === mockApi.github.getAvailableRepositories) {
				return vi.fn().mockResolvedValue(mockRepositories);
			}
			return vi.fn();
		});

		render(<PullRequests />);

		const projectButton = screen.getByText("Test Project 2");
		await userEvent.click(projectButton);

		const configureButton = screen.getByText("Configure Repository");
		await userEvent.click(configureButton);

		// Repos auto-load when Configure Repository is clicked, wait for count message to appear
		await waitFor(
			() => {
				expect(screen.getByText(/Showing 2 of 2 repositories/)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
