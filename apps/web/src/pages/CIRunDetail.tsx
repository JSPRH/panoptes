// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

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

export default function CIRunDetail() {
	const { runId } = useParams<{ runId: string }>();
	const navigate = useNavigate();
	const run = useQuery(api.github.getCIRun, runId ? { runId: runId as Id<"ciRuns"> } : "skip");
	const testRuns = useQuery(
		api.tests.getTestRunsByCIRunId,
		runId ? { ciRunId: runId as Id<"ciRuns"> } : "skip"
	);

	// Redirect to first test run if available
	useEffect(() => {
		if (testRuns && testRuns.length > 0) {
			navigate(`/runs/${testRuns[0]._id}`, { replace: true });
		}
	}, [testRuns, navigate]);

	if (runId === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<EmptyState
					title="No run selected"
					description="Use a valid run link from CI Runs."
					action={<Link to="/ci-runs">Back to CI Runs</Link>}
				/>
			</div>
		);
	}

	if (run === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (run === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<EmptyState
					title="Run not found"
					description="This CI run does not exist or was removed."
					action={<Link to="/ci-runs">Back to CI Runs</Link>}
				/>
			</div>
		);
	}

	// Show loading while checking for test runs
	if (testRuns === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	const selectedRun = run as CIRun;

	// If test runs exist, we'll redirect, but show a message in case redirect fails
	if (testRuns && testRuns.length > 0) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="Redirecting to test run..." />
				<p className="text-muted-foreground">Redirecting to test run...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader title="CI Run" description="Run details" />
			<p className="text-sm text-muted-foreground">
				<Link to="/ci-runs" className="text-primary hover:underline">
					CI Runs
				</Link>
				{" → Run details"}
			</p>
			{testRuns && testRuns.length === 0 && (
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="text-sm text-muted-foreground">
						No test runs are linked to this CI run. Test runs will appear here once tests are
						executed with the Panoptes reporter.
					</p>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Run Summary</CardTitle>
					<CardDescription>
						{formatTime(selectedRun.startedAt)} • {selectedRun.workflowName}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant={getStatusVariant(selectedRun.status, selectedRun.conclusion || undefined)}
						>
							{getStatusLabel(selectedRun.status, selectedRun.conclusion || undefined)}
						</Badge>
						<span className="text-sm text-muted-foreground">Branch: {selectedRun.branch}</span>
						<span className="text-sm text-muted-foreground">
							Commit: {selectedRun.commitSha.substring(0, 7)}
						</span>
						<span className="text-sm text-muted-foreground">
							Duration:{" "}
							{formatDuration(selectedRun.startedAt, selectedRun.completedAt || undefined)}
						</span>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="text-sm font-medium mb-1">Workflow</div>
						<div className="text-sm text-muted-foreground">{selectedRun.workflowName}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Status</div>
						<Badge
							variant={getStatusVariant(selectedRun.status, selectedRun.conclusion || undefined)}
						>
							{getStatusLabel(selectedRun.status, selectedRun.conclusion || undefined)}
						</Badge>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Branch</div>
						<div className="text-sm text-muted-foreground">{selectedRun.branch}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Commit</div>
						<div className="text-sm font-mono text-muted-foreground">{selectedRun.commitSha}</div>
					</div>
					{selectedRun.commitMessage && (
						<div>
							<div className="text-sm font-medium mb-1">Commit Message</div>
							<div className="text-sm text-muted-foreground">{selectedRun.commitMessage}</div>
						</div>
					)}
					<div>
						<div className="text-sm font-medium mb-1">Started At</div>
						<div className="text-sm text-muted-foreground">{formatTime(selectedRun.startedAt)}</div>
					</div>
					{selectedRun.completedAt && (
						<div>
							<div className="text-sm font-medium mb-1">Completed At</div>
							<div className="text-sm text-muted-foreground">
								{formatTime(selectedRun.completedAt)}
							</div>
						</div>
					)}
					<div>
						<div className="text-sm font-medium mb-1">Duration</div>
						<div className="text-sm text-muted-foreground">
							{formatDuration(selectedRun.startedAt, selectedRun.completedAt || undefined)}
						</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">GitHub</div>
						<a
							href={selectedRun.htmlUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline"
						>
							View on GitHub →
						</a>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
