// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { GitHubPageHeader } from "../components/GitHubPageHeader";
import { ProjectSelector } from "../components/ProjectSelector";
import { RepositoryConfig } from "../components/RepositoryConfig";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useGitHubSync } from "../hooks/useGitHubSync";
import { useProjectSelection } from "../hooks/useProjectSelection";

type PullRequest = Doc<"pullRequests">;

export default function PullRequests() {
	const [showRepoConfig, setShowRepoConfig] = useState(false);

	const { selectedProjectId, setSelectedProjectId, selectedProject } = useProjectSelection();
	const { handleSync } = useGitHubSync({
		projectId: selectedProjectId,
		onRepositoryNotConfigured: () => setShowRepoConfig(true),
	});

	const prs = useQuery(
		api.github.getPRsForProject,
		selectedProjectId ? { projectId: selectedProjectId, state: "open" } : "skip"
	);

	const getStateVariant = (state: string): "success" | "neutral" | "info" => {
		if (state === "open") return "success";
		if (state === "merged") return "info";
		return "neutral";
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<GitHubPageHeader
					title="Pull Requests"
					description="Open pull requests from GitHub"
					onSync={handleSync}
					showSyncButton={!!selectedProjectId}
				/>
				<ProjectSelector
					selectedProjectId={selectedProjectId}
					onProjectSelect={setSelectedProjectId}
				/>
			</div>

			{selectedProject && !selectedProject.repository && (
				<RepositoryConfig
					projectId={selectedProject._id}
					description="Configure the GitHub repository URL for this project to view pull requests"
					compact={!showRepoConfig}
				/>
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
									<Link
										key={pr._id}
										to={`/pull-requests/${pr.projectId}/${pr.prNumber}`}
										className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
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
												onClick={(e) => e.stopPropagation()}
											>
												View on GitHub
											</a>
										</div>
									</Link>
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
