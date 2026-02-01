// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PullRequest = Doc<"pullRequests">;
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

function getPRStateVariant(state: string): "success" | "neutral" | "info" {
	if (state === "open") return "success";
	if (state === "merged") return "info";
	return "neutral";
}

export default function PullRequestDetail() {
	const { projectId, prNumber } = useParams<{ projectId: string; prNumber: string }>();

	const pr = useQuery(
		api.github.getPR,
		projectId && prNumber
			? { projectId: projectId as Id<"projects">, prNumber: Number.parseInt(prNumber, 10) }
			: "skip"
	);

	const ciRuns = useQuery(
		api.github.getCIRunsForPR,
		pr && projectId
			? {
					projectId: projectId as Id<"projects">,
					branch: pr.branch,
					commitSha: pr.commitSha,
				}
			: "skip"
	);

	if (!projectId || !prNumber) {
		return (
			<div className="space-y-8">
				<PageHeader title="Pull Request" description="View pull request details" />
				<EmptyState
					title="No PR selected"
					description="Use a valid PR link from Pull Requests."
					action={<Link to="/pull-requests">Back to Pull Requests</Link>}
				/>
			</div>
		);
	}

	if (pr === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Pull Request" description="View pull request details" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (pr === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="Pull Request" description="View pull request details" />
				<EmptyState
					title="PR not found"
					description="This pull request does not exist or was removed."
					action={<Link to="/pull-requests">Back to Pull Requests</Link>}
				/>
			</div>
		);
	}

	const selectedPR = pr as PullRequest;

	return (
		<div className="space-y-8">
			<PageHeader title="Pull Request" description="PR details" />
			<p className="text-sm text-muted-foreground">
				<Link to="/pull-requests" className="text-primary hover:underline">
					Pull Requests
				</Link>
				{" → PR details"}
			</p>

			<Card>
				<CardHeader>
					<CardTitle>PR Summary</CardTitle>
					<CardDescription>
						#{selectedPR.prNumber}: {selectedPR.title}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getPRStateVariant(selectedPR.state)}>{selectedPR.state}</Badge>
						<span className="text-sm text-muted-foreground">Author: {selectedPR.author}</span>
						<span className="text-sm text-muted-foreground">
							Branch: {selectedPR.branch} → {selectedPR.baseBranch}
						</span>
						{selectedPR.commitSha && (
							<span className="text-sm text-muted-foreground">
								Commit: {selectedPR.commitSha.substring(0, 7)}
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="text-sm font-medium mb-1">Title</div>
						<div className="text-sm text-muted-foreground">{selectedPR.title}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">State</div>
						<Badge variant={getPRStateVariant(selectedPR.state)}>{selectedPR.state}</Badge>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Author</div>
						<div className="text-sm text-muted-foreground">{selectedPR.author}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Branch</div>
						<div className="text-sm text-muted-foreground">
							{selectedPR.branch} → {selectedPR.baseBranch}
						</div>
					</div>
					{selectedPR.commitSha && (
						<div>
							<div className="text-sm font-medium mb-1">Commit</div>
							<div className="text-sm font-mono text-muted-foreground">{selectedPR.commitSha}</div>
						</div>
					)}
					<div>
						<div className="text-sm font-medium mb-1">Created At</div>
						<div className="text-sm text-muted-foreground">{formatTime(selectedPR.createdAt)}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Updated At</div>
						<div className="text-sm text-muted-foreground">{formatTime(selectedPR.updatedAt)}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">GitHub</div>
						<a
							href={selectedPR.htmlUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline"
						>
							View on GitHub →
						</a>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>CI Runs</CardTitle>
					<CardDescription>
						{ciRuns?.length || 0} CI run{ciRuns?.length !== 1 ? "s" : ""} associated with this PR
					</CardDescription>
				</CardHeader>
				<CardContent>
					{ciRuns === undefined ? (
						<p className="text-sm text-muted-foreground">Loading CI runs...</p>
					) : ciRuns.length === 0 ? (
						<EmptyState
							title="No CI runs found"
							description="No CI runs have been associated with this pull request yet. CI runs are matched by branch name and commit SHA."
						/>
					) : (
						<div className="space-y-2">
							{ciRuns.map((run: CIRun) => (
								<Link
									key={run._id}
									to={`/ci-runs/${run._id}`}
									className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
								>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<div className="font-medium">{run.workflowName}</div>
											<Badge variant={getStatusVariant(run.status, run.conclusion || undefined)}>
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
		</div>
	);
}
