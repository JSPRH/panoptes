// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type TestRun = Doc<"testRuns">;
type Test = Doc<"tests">;

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function formatDuration(ms: number | undefined): string {
	if (ms == null) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusVariant(status: string): "success" | "error" | "info" | "neutral" {
	if (status === "passed") return "success";
	if (status === "failed") return "error";
	if (status === "running") return "info";
	return "neutral";
}

export default function TestRunDetail() {
	const { runId } = useParams<{ runId: string }>();
	const run = useQuery(api.tests.getTestRun, runId ? { runId: runId as Id<"testRuns"> } : "skip");
	const testsForRun = useQuery(
		api.tests.getTests,
		runId ? { testRunId: runId as Id<"testRuns"> } : "skip"
	);

	if (runId === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Run" description="View a single test run" />
				<EmptyState
					title="No run selected"
					description="Use a valid run link from Test Runs."
					action={<Link to="/runs">Back to Test Runs</Link>}
				/>
			</div>
		);
	}

	if (run === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Run" description="View a single test run" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (run === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Run" description="View a single test run" />
				<EmptyState
					title="Run not found"
					description="This test run does not exist or was removed."
					action={<Link to="/runs">Back to Test Runs</Link>}
				/>
			</div>
		);
	}

	const selectedRun = run as TestRun;

	return (
		<div className="space-y-8">
			<PageHeader title="Test Run" description="Run details" />
			<p className="text-sm text-muted-foreground">
				<Link to="/runs" className="text-primary hover:underline">
					Test Runs
				</Link>
				{" → Run details"}
			</p>

			<Card>
				<CardHeader>
					<CardTitle>Run summary</CardTitle>
					<CardDescription>
						{formatTime(selectedRun.startedAt)} • {selectedRun.framework} • {selectedRun.testType}
						{selectedRun.triggeredBy != null && ` • ${selectedRun.triggeredBy}`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getStatusVariant(selectedRun.status)}>{selectedRun.status}</Badge>
						<Badge variant="neutral">{selectedRun.framework}</Badge>
						<Badge variant="neutral">{selectedRun.testType}</Badge>
						{selectedRun.ci != null && (
							<Badge variant={selectedRun.ci ? "info" : "neutral"}>
								{selectedRun.ci ? "CI" : "Local"}
							</Badge>
						)}
						<span className="text-sm text-muted-foreground">
							{formatDuration(selectedRun.duration)}
						</span>
						<span className="text-sm text-muted-foreground">
							{selectedRun.passedTests}/{selectedRun.totalTests} passed
							{selectedRun.failedTests > 0 && `, ${selectedRun.failedTests} failed`}
							{selectedRun.skippedTests > 0 && `, ${selectedRun.skippedTests} skipped`}
						</span>
						{selectedRun.commitSha != null && (
							<span className="text-xs font-mono text-muted-foreground">
								{selectedRun.commitSha.slice(0, 7)}
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Test executions in this run</CardTitle>
							<CardDescription>
								{testsForRun?.length ?? 0} test execution{testsForRun?.length !== 1 ? "s" : ""}
							</CardDescription>
						</div>
						<Link to={`/explorer?runId=${runId}`} className="text-sm text-primary hover:underline">
							Open in Test Explorer
						</Link>
					</div>
				</CardHeader>
				<CardContent>
					{testsForRun?.length ? (
						<div className="space-y-2">
							{testsForRun.map((test: Test) => {
								const testDefinitionPath = `/tests/${encodeURIComponent(test.projectId)}/${encodeURIComponent(test.name)}/${encodeURIComponent(test.file)}${test.line != null ? `?line=${test.line}` : ""}`;
								return (
									<div
										key={test._id}
										className="flex items-center justify-between py-2 px-3 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
									>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<Link
													to={`/executions/${test._id}`}
													className="font-medium text-sm hover:text-primary hover:underline"
												>
													{test.name}
												</Link>
												<Link
													to={testDefinitionPath}
													className="text-xs text-muted-foreground hover:text-primary hover:underline"
													onClick={(e) => e.stopPropagation()}
												>
													(View all executions)
												</Link>
											</div>
											<div className="text-xs text-muted-foreground">
												{test.file}
												{test.line != null && `:${test.line}`}
											</div>
											{test.error != null && (
												<div className="text-xs text-destructive mt-1 truncate max-w-full">
													{test.error}
												</div>
											)}
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">{test.duration}ms</span>
											<Link to={`/executions/${test._id}`}>
												<Badge
													variant={getStatusVariant(test.status)}
													className="cursor-pointer hover:opacity-80"
												>
													{test.status}
												</Badge>
											</Link>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-muted-foreground text-sm">No test executions in this run.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
