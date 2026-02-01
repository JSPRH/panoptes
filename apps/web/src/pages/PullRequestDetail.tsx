// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { type CloudAgentActionType, CloudAgentButton } from "../components/CloudAgentButton";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PullRequest = Doc<"pullRequests">;
type CIRun = Doc<"ciRuns">;
type Test = Doc<"tests">;

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

	const coverageComparison = useQuery(
		api.tests.getCoverageComparisonForPR,
		pr && projectId
			? {
					projectId: projectId as Id<"projects">,
					prBranch: pr.branch,
					baseBranch: pr.baseBranch,
				}
			: "skip"
	);

	const newFailingTests = useQuery(
		api.tests.getNewFailingTestsForPR,
		pr && projectId
			? {
					projectId: projectId as Id<"projects">,
					prBranch: pr.branch,
					baseBranch: pr.baseBranch,
				}
			: "skip"
	);

	// Get all tests for PR test runs
	const allPRTests = useQuery(
		api.tests.getTestsForPR,
		pr && projectId
			? {
					projectId: projectId as Id<"projects">,
					branch: pr.branch,
				}
			: "skip"
	);

	// Find the latest failed CI run (must be before conditional returns)
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

	const triggerCloudAgent = useAction(api.ciAnalysisActions.triggerCursorCloudAgent);

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

	const handleTriggerCloudAgent = async (actionType?: CloudAgentActionType, createPR?: boolean) => {
		if (!latestFailedCIRun) {
			throw new Error("No failed CI run found");
		}
		// Only pass fix_test or fix_bug to the action, as it doesn't support other types
		const validActionType =
			actionType === "fix_test" || actionType === "fix_bug" ? actionType : "fix_bug";
		const result = await triggerCloudAgent({
			ciRunId: latestFailedCIRun._id,
			actionType: validActionType,
			createPR: createPR ?? true, // Default to true for backward compatibility
		});
		// Handle restart_ci case
		if ("success" in result && result.success) {
			return {
				agentUrl: undefined,
				prUrl: undefined,
				branch: undefined,
				commitSha: undefined,
				createPR: undefined,
			};
		}
		// Handle agent launch case
		if ("agentId" in result) {
			return {
				agentUrl: result.agentUrl,
				prUrl: result.prUrl,
				branch: result.branch,
				commitSha: result.commitSha,
				createPR: result.createPR,
			};
		}
		return {
			agentUrl: undefined,
			prUrl: undefined,
			branch: undefined,
			commitSha: undefined,
			createPR: undefined,
		};
	};

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
							{newFailingTests && newFailingTests.length > 0 && (
								<div className="text-sm">
									<div className="font-medium mb-1">New Failing Tests:</div>
									<div className="text-muted-foreground">
										{newFailingTests.length} test{newFailingTests.length !== 1 ? "s" : ""} that
										passed in {pr.baseBranch} but failed in this PR
									</div>
								</div>
							)}
							<div className="pt-2">
								<CloudAgentButton
									onTrigger={handleTriggerCloudAgent}
									actionType="fix_bug"
									showActionSelector={true}
									showPRToggle={true}
									className="w-full"
									variant="default"
									size="default"
								>
									🚀 Launch Agent to Fix CI
								</CloudAgentButton>
							</div>
							<div className="text-xs text-muted-foreground">
								The agent will have access to: PR context, CI run details, failed tests, and
								codebase information.
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{coverageComparison && (
				<Card>
					<CardHeader>
						<CardTitle>Coverage Comparison</CardTitle>
						<CardDescription>
							Comparing {pr.branch} vs {pr.baseBranch}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-sm font-medium mb-1">Base Branch ({pr.baseBranch})</div>
									<div className="text-2xl font-bold">
										{coverageComparison.basePercentage.toFixed(1)}%
									</div>
									<div className="text-sm text-muted-foreground">
										{coverageComparison.base.linesCovered.toLocaleString()} /{" "}
										{coverageComparison.base.linesTotal.toLocaleString()} lines
									</div>
								</div>
								<div>
									<div className="text-sm font-medium mb-1">PR Branch ({pr.branch})</div>
									<div className="text-2xl font-bold">
										{coverageComparison.prPercentage.toFixed(1)}%
									</div>
									<div className="text-sm text-muted-foreground">
										{coverageComparison.pr.linesCovered.toLocaleString()} /{" "}
										{coverageComparison.pr.linesTotal.toLocaleString()} lines
									</div>
								</div>
							</div>
							<div className="pt-4 border-t">
								<div className="flex items-center gap-2">
									<div className="text-sm font-medium">Change:</div>
									<Badge
										variant={
											coverageComparison.change > 0
												? "success"
												: coverageComparison.change < 0
													? "error"
													: "neutral"
										}
									>
										{coverageComparison.change > 0 ? "+" : ""}
										{coverageComparison.change.toFixed(1)}%
									</Badge>
									{coverageComparison.change > 0 && (
										<span className="text-sm text-muted-foreground">Coverage increased</span>
									)}
									{coverageComparison.change < 0 && (
										<span className="text-sm text-muted-foreground">Coverage decreased</span>
									)}
									{coverageComparison.change === 0 && (
										<span className="text-sm text-muted-foreground">No change</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{newFailingTests && newFailingTests.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>New Failing Tests</CardTitle>
						<CardDescription>
							{newFailingTests.length} test{newFailingTests.length !== 1 ? "s" : ""} that failed in
							this PR but passed in {pr.baseBranch}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{newFailingTests.map((test: Test) => (
								<div
									key={test._id}
									className="flex items-start justify-between py-2 px-3 rounded-lg border border-destructive/50 bg-destructive/5"
								>
									<div className="flex-1">
										<div className="font-medium text-sm">{test.name}</div>
										<div className="text-xs text-muted-foreground mt-1">
											{test.file}
											{test.line && `:${test.line}`}
										</div>
										{test.error && (
											<div className="text-xs text-destructive mt-1 line-clamp-2">{test.error}</div>
										)}
									</div>
									<Badge variant="error" className="ml-2">
										Failed
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{allPRTests && allPRTests.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Tests Run</CardTitle>
						<CardDescription>
							{allPRTests.length} test{allPRTests.length !== 1 ? "s" : ""} executed in CI runs
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{allPRTests.map((test: Test) => (
								<div
									key={test._id}
									className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-card"
								>
									<div className="flex-1">
										<div className="font-medium text-sm">{test.name}</div>
										<div className="text-xs text-muted-foreground mt-1">
											{test.file}
											{test.line && `:${test.line}`}
										</div>
									</div>
									<Badge
										variant={
											test.status === "passed"
												? "success"
												: test.status === "failed"
													? "error"
													: "neutral"
										}
										className="ml-2"
									>
										{test.status}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

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
