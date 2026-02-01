// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type CloudAgentActionType, CloudAgentButton } from "../components/CloudAgentButton";
import { EmptyState } from "../components/EmptyState";
import { GitHubPageHeader } from "../components/GitHubPageHeader";
import { ProjectSelector } from "../components/ProjectSelector";
import { RepositoryConfig } from "../components/RepositoryConfig";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useGitHubSync } from "../hooks/useGitHubSync";
import { useProjectSelection } from "../hooks/useProjectSelection";

type CIRun = Doc<"ciRuns">;

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function formatDuration(startedAt: number, completedAt: number | undefined): string {
	if (!completedAt) return "—";
	const duration = Math.round((completedAt - startedAt) / 1000);
	if (duration < 60) return `${duration}s`;
	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;
	return `${minutes}m ${seconds}s`;
}

function getStatusVariant(
	status: string,
	conclusion?: string
): "success" | "error" | "info" | "neutral" {
	if (conclusion === "success") return "success";
	if (conclusion === "failure") return "error";
	if (status === "in_progress" || status === "queued") return "info";
	return "neutral";
}

function getStatusLabel(status: string, conclusion?: string) {
	if (conclusion) return conclusion;
	return status;
}

export default function MainBranch() {
	const { selectedProjectId, setSelectedProjectId, selectedProject } = useProjectSelection();
	const { handleSync } = useGitHubSync({
		projectId: selectedProjectId,
		onRepositoryNotConfigured: () => {},
	});

	// Get CI runs for main branch
	// Using "main" as the default branch name (standard convention)
	const mainBranchName = "main";
	const ciRuns = useQuery(
		api.github.getCIRunsForPR,
		selectedProjectId
			? {
					projectId: selectedProjectId as Id<"projects">,
					branch: mainBranchName,
				}
			: "skip"
	);

	// Find the latest failed CI run
	const latestFailedCIRun = useMemo(() => {
		if (!ciRuns) return null;
		const failedRuns = ciRuns.filter(
			(run) =>
				run.conclusion === "failure" || (run.status === "completed" && run.conclusion !== "success")
		);
		if (failedRuns.length === 0) return null;
		// Sort by startedAt descending to get the latest
		return failedRuns.sort((a, b) => b.startedAt - a.startedAt)[0];
	}, [ciRuns]);

	// Sort all CI runs by startedAt descending (most recent first)
	const sortedCIRuns = useMemo(() => {
		if (!ciRuns) return [];
		return [...ciRuns].sort((a, b) => b.startedAt - a.startedAt);
	}, [ciRuns]);

	const triggerCloudAgent = useAction(api.ciAnalysisActions.triggerCursorCloudAgent);

	const handleTriggerCloudAgent = async (actionType?: CloudAgentActionType) => {
		if (!latestFailedCIRun) {
			throw new Error("No failed CI run found");
		}
		// Only pass fix_test or fix_bug to the action, as it doesn't support other types
		const validActionType =
			actionType === "fix_test" || actionType === "fix_bug" ? actionType : "fix_bug";
		const result = await triggerCloudAgent({
			ciRunId: latestFailedCIRun._id,
			actionType: validActionType,
		});
		// Handle restart_ci case
		if ("success" in result && result.success) {
			return { agentUrl: undefined, prUrl: undefined };
		}
		// Handle agent launch case
		if ("agentId" in result) {
			return {
				agentUrl: result.agentUrl,
				prUrl: result.prUrl,
			};
		}
		return { agentUrl: undefined, prUrl: undefined };
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<GitHubPageHeader
					title="Main Branch"
					description={`CI runs for ${mainBranchName} branch`}
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
					description="Select a GitHub repository for this project to view CI runs"
					compact={false}
				/>
			)}

			{selectedProject?.repository && (
				<>
					{latestFailedCIRun && (
						<Card>
							<CardHeader>
								<CardTitle>Fix CI Failure</CardTitle>
								<CardDescription>
									Latest failed CI run: {latestFailedCIRun.workflowName} (commit{" "}
									{latestFailedCIRun.commitSha.substring(0, 7)})
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center gap-2">
										<Badge variant="error">Failed</Badge>
										<span className="text-sm text-muted-foreground">
											{formatTime(latestFailedCIRun.startedAt)}
											{latestFailedCIRun.completedAt &&
												` • Duration: ${formatDuration(latestFailedCIRun.startedAt, latestFailedCIRun.completedAt)}`}
										</span>
									</div>
									{latestFailedCIRun.commitMessage && (
										<div className="text-sm text-muted-foreground">
											{latestFailedCIRun.commitMessage}
										</div>
									)}
									<div className="pt-2">
										<CloudAgentButton
											onTrigger={handleTriggerCloudAgent}
											actionType="fix_bug"
											showActionSelector={true}
											className="w-full"
											variant="default"
											size="default"
										>
											🚀 Launch Agent to Fix CI
										</CloudAgentButton>
									</div>
									<div className="text-xs text-muted-foreground">
										The agent will have access to: CI run details, failed tests, and codebase
										information.
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader>
							<CardTitle>CI Runs</CardTitle>
							<CardDescription>
								{sortedCIRuns.length} CI run{sortedCIRuns.length !== 1 ? "s" : ""} on{" "}
								{mainBranchName} branch
							</CardDescription>
						</CardHeader>
						<CardContent>
							{ciRuns === undefined ? (
								<p className="text-sm text-muted-foreground">Loading CI runs...</p>
							) : sortedCIRuns.length === 0 ? (
								<EmptyState
									title="No CI runs found"
									description={`No CI runs have been found for the ${mainBranchName} branch yet. CI runs are matched by branch name.`}
									action={
										<Button onClick={handleSync} variant="default" size="sm">
											Sync GitHub Data
										</Button>
									}
								/>
							) : (
								<div className="space-y-2">
									{sortedCIRuns.map((run: CIRun) => (
										<Link
											key={run._id}
											to={`/ci-runs/${run._id}`}
											className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<div className="font-medium">{run.workflowName}</div>
													<Badge
														variant={getStatusVariant(run.status, run.conclusion || undefined)}
													>
														{getStatusLabel(run.status, run.conclusion || undefined)}
													</Badge>
												</div>
												<div className="text-sm text-muted-foreground mt-1">
													Commit: {run.commitSha.substring(0, 7)}
													{run.commitMessage && ` • ${run.commitMessage}`}
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													{formatTime(run.startedAt)}
													{run.completedAt &&
														` • Duration: ${formatDuration(run.startedAt, run.completedAt)}`}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<a
													href={run.htmlUrl}
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
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
