// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PullRequest = Doc<"pullRequests">;
type Project = Doc<"projects">;
type Repository = {
	fullName: string;
	name: string;
	owner: string;
	url: string;
	private: boolean;
	description: string | null;
};

export default function PullRequests() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [showRepoConfig, setShowRepoConfig] = useState(false);
	const [selectedRepo, setSelectedRepo] = useState<string>("");
	const [repoSearch, setRepoSearch] = useState("");
	const [isLoadingRepos, setIsLoadingRepos] = useState(false);
	const [availableRepos, setAvailableRepos] = useState<Repository[]>([]);

	const projects = useQuery(api.tests.getProjects);
	const syncGitHubData = useAction(api.github.syncProjectGitHubData);
	const updateProjectRepository = useMutation(api.tests.updateProjectRepository);
	const getAvailableRepositories = useAction(api.github.getAvailableRepositories);

	const prs = useQuery(
		api.github.getPRsForProject,
		selectedProjectId ? { projectId: selectedProjectId, state: "open" } : "skip"
	);

	const selectedProject = projects?.find((p) => p._id === selectedProjectId);

	// Auto-select first project if only one exists
	useEffect(() => {
		if (projects && projects.length === 1 && !selectedProjectId) {
			setSelectedProjectId(projects[0]._id);
		}
	}, [projects, selectedProjectId]);

	const handleSync = async () => {
		if (!selectedProjectId) return;
		try {
			const result = await syncGitHubData({ projectId: selectedProjectId });
			let message = "";
			if (result.partialSuccess && result.warnings) {
				message = `Partially synced: ${result.ciRunsCount || 0} CI runs, ${result.prsCount || 0} PRs.\n\nWarnings:\n${result.warnings.join("\n")}`;
			} else {
				message = `GitHub data synced successfully! Stored ${result.ciRunsCount || 0} CI runs and ${result.prsCount || 0} PRs.`;
			}
			alert(message);
		} catch (error) {
			console.error("Failed to sync GitHub data:", error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes("repository not configured")) {
				setShowRepoConfig(true);
			}
			alert(`Failed to sync: ${errorMessage}`);
		}
	};

	const handleLoadRepositories = async () => {
		setIsLoadingRepos(true);
		try {
			const repos = await getAvailableRepositories({ limit: 100 });
			setAvailableRepos(repos);
		} catch (error) {
			console.error("Failed to load repositories:", error);
			alert(
				`Failed to load repositories: ${error instanceof Error ? error.message : String(error)}`
			);
		} finally {
			setIsLoadingRepos(false);
		}
	};

	const handleShowRepoConfig = () => {
		setShowRepoConfig(true);
		if (availableRepos.length === 0) {
			handleLoadRepositories();
		}
	};

	const handleSaveRepository = async () => {
		if (!selectedProjectId || !selectedRepo.trim()) {
			alert("Please select a repository");
			return;
		}
		try {
			await updateProjectRepository({
				projectId: selectedProjectId,
				repository: selectedRepo.trim(),
			});
			setShowRepoConfig(false);
			setSelectedRepo("");
			setRepoSearch("");
			alert("Repository saved successfully!");
		} catch (error) {
			console.error("Failed to save repository:", error);
			alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const filteredRepos = availableRepos.filter(
		(repo) =>
			repo.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
			repo.description?.toLowerCase().includes(repoSearch.toLowerCase())
	);

	const getStateVariant = (state: string): "success" | "neutral" | "info" => {
		if (state === "open") return "success";
		if (state === "merged") return "info";
		return "neutral";
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<PageHeader title="Pull Requests" description="Open pull requests from GitHub" />
				{selectedProjectId && (
					<Button onClick={handleSync} variant="outline" size="sm">
						Sync GitHub Data
					</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Project Selection</CardTitle>
					<CardDescription>Select a project to view pull requests</CardDescription>
				</CardHeader>
				<CardContent>
					{projects && projects.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{projects.map((project: Project) => (
								<Button
									key={project._id}
									variant={selectedProjectId === project._id ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedProjectId(project._id as Id<"projects">)}
								>
									{project.name}
									{!project.repository && (
										<span className="ml-2 text-xs text-warning">(no repo)</span>
									)}
								</Button>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">No projects found. Create a project first.</p>
					)}
				</CardContent>
			</Card>

			{selectedProject && !selectedProject.repository && (
				<Card>
					<CardHeader>
						<CardTitle>Repository Not Configured</CardTitle>
						<CardDescription>
							Configure the GitHub repository URL for this project to view pull requests
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!showRepoConfig ? (
							<>
								<p className="text-muted-foreground">
									This project doesn't have a repository configured. Add a repository URL to view
									pull requests.
								</p>
								<div className="space-y-2">
									<Button onClick={handleShowRepoConfig} variant="default" size="sm">
										Configure Repository
									</Button>
									<p className="text-xs text-muted-foreground">
										Note: Make sure GITHUB_ACCESS_TOKEN_STORYBOOK is configured in Convex secrets
										for GitHub API access.
									</p>
								</div>
							</>
						) : (
							<div className="space-y-4">
								<div>
									<label htmlFor="repo-select" className="block text-sm font-medium mb-2">
										Select Repository
									</label>
									{isLoadingRepos ? (
										<div className="text-sm text-muted-foreground">Loading repositories...</div>
									) : availableRepos.length === 0 ? (
										<div className="space-y-2">
											<p className="text-sm text-muted-foreground">
												No repositories loaded. Click "Load Repositories" to fetch from GitHub.
											</p>
											<Button onClick={handleLoadRepositories} variant="outline" size="sm">
												Load Repositories
											</Button>
										</div>
									) : (
										<div className="space-y-2">
											<input
												type="text"
												placeholder="Search repositories..."
												value={repoSearch}
												onChange={(e) => setRepoSearch(e.target.value)}
												className="w-full px-4 py-2 border rounded-md mb-2"
											/>
											<select
												id="repo-select"
												value={selectedRepo}
												onChange={(e) => setSelectedRepo(e.target.value)}
												className="w-full px-4 py-2 border rounded-md"
												size={Math.min(filteredRepos.length, 10)}
											>
												<option value="">-- Select a repository --</option>
												{filteredRepos.map((repo) => (
													<option key={repo.fullName} value={repo.fullName}>
														{repo.fullName} {repo.private ? "(private)" : ""}
														{repo.description ? ` - ${repo.description}` : ""}
													</option>
												))}
											</select>
											{filteredRepos.length === 0 && repoSearch && (
												<p className="text-xs text-muted-foreground">
													No repositories found matching "{repoSearch}"
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												Showing {filteredRepos.length} of {availableRepos.length} repositories
											</p>
										</div>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										onClick={handleSaveRepository}
										variant="default"
										size="sm"
										disabled={!selectedRepo.trim()}
									>
										Save Repository
									</Button>
									<Button
										onClick={() => {
											setShowRepoConfig(false);
											setSelectedRepo("");
											setRepoSearch("");
										}}
										variant="outline"
										size="sm"
									>
										Cancel
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{selectedProject?.repository && (
				<Card>
					<CardHeader>
						<CardTitle>Open Pull Requests</CardTitle>
						<CardDescription>
							{prs?.length || 0} open PR{prs?.length !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{prs && prs.length > 0 ? (
							<div className="space-y-2">
								{prs.map((pr: PullRequest) => (
									<div
										key={pr._id}
										className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
									>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<div className="font-medium">
													#{pr.prNumber}: {pr.title}
												</div>
												<Badge variant={getStateVariant(pr.state)}>{pr.state}</Badge>
											</div>
											<div className="text-sm text-muted-foreground mt-1">
												Author: {pr.author} • {pr.branch} → {pr.baseBranch}
												{pr.commitSha && ` • Commit: ${pr.commitSha.substring(0, 7)}`}
											</div>
											<div className="text-xs text-muted-foreground mt-1">
												Created: {new Date(pr.createdAt).toLocaleString()} • Updated:{" "}
												{new Date(pr.updatedAt).toLocaleString()}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<a
												href={pr.htmlUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-sm text-primary hover:underline"
											>
												View on GitHub
											</a>
										</div>
									</div>
								))}
							</div>
						) : (
							<EmptyState
								title="No open pull requests"
								description="Click Sync GitHub Data to fetch pull requests from GitHub for this project."
								action={
									<Button onClick={handleSync} variant="default" size="sm">
										Sync GitHub Data
									</Button>
								}
							/>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
