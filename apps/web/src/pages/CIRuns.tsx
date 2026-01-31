// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type CIRun = Doc<"ciRuns">;
type Project = Doc<"projects">;

type Repository = {
	fullName: string;
	name: string;
	owner: string;
	url: string;
	private: boolean;
	description: string | null;
};

export default function CIRuns() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [showRepoConfig, setShowRepoConfig] = useState(false);
	const [selectedRepo, setSelectedRepo] = useState<string>("");
	const [repoSearch, setRepoSearch] = useState("");
	const [isLoadingRepos, setIsLoadingRepos] = useState(false);
	const [availableRepos, setAvailableRepos] = useState<Repository[]>([]);

	const projects = useQuery(api.tests.getProjects);
	const syncGitHubData = useAction(api.github.syncProjectGitHubData);
	const updateProjectRepository = useMutation(api.tests.updateProjectRepository);
	const getAvailableRepositories = useAction(api.github.getAvailableRepositories);

	const ciRuns = useQuery(
		api.github.getCIRunsForProject,
		selectedProjectId ? { projectId: selectedProjectId, limit: 50 } : "skip"
	);

	const selectedProject = projects?.find((p) => p._id === selectedProjectId);

	const handleSync = async () => {
		if (!selectedProjectId) return;
		try {
			await syncGitHubData({ projectId: selectedProjectId });
			alert("GitHub data synced successfully!");
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

	const filteredRuns = ciRuns?.filter((run: CIRun) => {
		if (statusFilter === "all") return true;
		if (statusFilter === "success") return run.conclusion === "success";
		if (statusFilter === "failure") return run.conclusion === "failure";
		return run.status === statusFilter;
	});

	const getStatusColor = (status: string, conclusion?: string) => {
		if (conclusion === "success") return "text-green-600 bg-green-100";
		if (conclusion === "failure") return "text-red-600 bg-red-100";
		if (status === "in_progress" || status === "queued") return "text-blue-600 bg-blue-100";
		return "text-gray-600 bg-gray-100";
	};

	const getStatusLabel = (status: string, conclusion?: string) => {
		if (conclusion) return conclusion;
		return status;
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">CI Runs</h1>
					<p className="text-muted-foreground">GitHub Actions workflow runs</p>
				</div>
				{selectedProjectId && (
					<Button onClick={handleSync} variant="outline" size="sm">
						Sync GitHub Data
					</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Project Selection</CardTitle>
					<CardDescription>Select a project to view CI runs</CardDescription>
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
										<span className="ml-2 text-xs text-yellow-600">(no repo)</span>
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
							Configure the GitHub repository URL for this project to view CI runs
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!showRepoConfig ? (
							<>
								<p className="text-muted-foreground">
									This project doesn't have a repository configured. Add a repository URL to view CI
									runs.
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
				<>
					<Card>
						<CardHeader>
							<CardTitle>Filters</CardTitle>
						</CardHeader>
						<CardContent>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-4 py-2 border rounded-md"
							>
								<option value="all">All Status</option>
								<option value="success">Success</option>
								<option value="failure">Failure</option>
								<option value="in_progress">In Progress</option>
								<option value="queued">Queued</option>
							</select>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>CI Runs</CardTitle>
							<CardDescription>
								{filteredRuns?.length || 0} run{filteredRuns?.length !== 1 ? "s" : ""} found
							</CardDescription>
						</CardHeader>
						<CardContent>
							{filteredRuns && filteredRuns.length > 0 ? (
								<div className="space-y-2">
									{filteredRuns.map((run: CIRun) => (
										<div
											key={run._id}
											className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<div className="font-medium">{run.workflowName}</div>
													<span
														className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
															run.status,
															run.conclusion || undefined
														)}`}
													>
														{getStatusLabel(run.status, run.conclusion || undefined)}
													</span>
												</div>
												<div className="text-sm text-muted-foreground mt-1">
													Branch: {run.branch} • Commit: {run.commitSha.substring(0, 7)}
													{run.commitMessage && ` • ${run.commitMessage}`}
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													{new Date(run.startedAt).toLocaleString()}
													{run.completedAt &&
														` • Duration: ${Math.round((run.completedAt - run.startedAt) / 1000)}s`}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<a
													href={run.htmlUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="text-sm text-blue-600 hover:text-blue-800 underline"
												>
													View on GitHub
												</a>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">
									No CI runs found. Click "Sync GitHub Data" to fetch runs from GitHub.
								</p>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
