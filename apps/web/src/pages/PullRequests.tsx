// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PullRequest = Doc<"pullRequests">;
type Project = Doc<"projects">;

export default function PullRequests() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [showRepoConfig, setShowRepoConfig] = useState(false);
	const [repoUrl, setRepoUrl] = useState("");

	const projects = useQuery(api.tests.getProjects);
	const syncGitHubData = useAction(api.github.syncProjectGitHubData);
	const updateProjectRepository = useMutation(api.tests.updateProjectRepository);

	const prs = useQuery(
		api.github.getPRsForProject,
		selectedProjectId ? { projectId: selectedProjectId, state: "open" } : "skip"
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

	const handleSaveRepository = async () => {
		if (!selectedProjectId || !repoUrl.trim()) {
			alert("Please enter a repository URL");
			return;
		}
		try {
			await updateProjectRepository({ projectId: selectedProjectId, repository: repoUrl.trim() });
			setShowRepoConfig(false);
			setRepoUrl("");
			alert("Repository URL saved successfully!");
		} catch (error) {
			console.error("Failed to save repository:", error);
			alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const getStateColor = (state: string) => {
		if (state === "open") return "text-green-600 bg-green-100";
		if (state === "merged") return "text-purple-600 bg-purple-100";
		return "text-gray-600 bg-gray-100";
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Pull Requests</h1>
					<p className="text-muted-foreground">Open pull requests from GitHub</p>
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
									<Button onClick={() => setShowRepoConfig(true)} variant="default" size="sm">
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
									<label htmlFor="repo-url" className="block text-sm font-medium mb-2">
										Repository URL
									</label>
									<input
										id="repo-url"
										type="text"
										placeholder="https://github.com/owner/repo or owner/repo"
										value={repoUrl}
										onChange={(e) => setRepoUrl(e.target.value)}
										className="w-full px-4 py-2 border rounded-md"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										Enter a GitHub repository URL (e.g., https://github.com/owner/repo) or
										owner/repo
									</p>
								</div>
								<div className="flex gap-2">
									<Button onClick={handleSaveRepository} variant="default" size="sm">
										Save Repository
									</Button>
									<Button
										onClick={() => {
											setShowRepoConfig(false);
											setRepoUrl("");
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
										className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
									>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<div className="font-medium">
													#{pr.prNumber}: {pr.title}
												</div>
												<span
													className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(pr.state)}`}
												>
													{pr.state}
												</span>
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
								No open pull requests found. Click "Sync GitHub Data" to fetch PRs from GitHub.
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
