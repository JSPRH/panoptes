// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type TestRun = Doc<"testRuns">;
type Test = Doc<"tests">;
type Project = Doc<"projects">;

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

export default function TestRuns() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [sourceFilter, setSourceFilter] = useState<string>("all");
	const [runnerFilter, setRunnerFilter] = useState<string>("all");
	const [selectedRunId, setSelectedRunId] = useState<Id<"testRuns"> | null>(null);

	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(
		api.tests.getTestRuns,
		selectedProjectId
			? {
					projectId: selectedProjectId,
					ci: sourceFilter === "ci" ? true : sourceFilter === "local" ? false : undefined,
					triggeredBy: runnerFilter === "all" ? undefined : runnerFilter,
					limit: 100,
				}
			: "skip"
	);
	const testsForRun = useQuery(
		api.tests.getTests,
		selectedRunId ? { testRunId: selectedRunId } : "skip"
	);

	const selectedRun = testRuns?.find((r) => r._id === selectedRunId);

	// Derive distinct runners from current runs (for dropdown; only truthy triggeredBy)
	const distinctRunners = useMemo(() => {
		if (!testRuns?.length) return [];
		const set = new Set<string>();
		for (const r of testRuns) {
			if (r.triggeredBy) set.add(r.triggeredBy);
		}
		return Array.from(set).sort();
	}, [testRuns]);

	// Auto-select first project if only one exists
	useEffect(() => {
		if (projects && projects.length === 1 && !selectedProjectId) {
			setSelectedProjectId(projects[0]._id);
		}
	}, [projects, selectedProjectId]);

	// Clear selected run when project or filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally clear selection when filters change
	useEffect(() => {
		setSelectedRunId(null);
	}, [selectedProjectId, sourceFilter, runnerFilter]);

	const getStatusVariant = (status: string): "success" | "error" | "info" | "neutral" => {
		if (status === "passed") return "success";
		if (status === "failed") return "error";
		if (status === "running") return "info";
		return "neutral";
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title="Test Runs"
				description="Browse test runs by project, source (CI/Local), and runner. Select a run to see its tests."
			/>

			<Card>
				<CardHeader>
					<CardTitle>Project</CardTitle>
					<CardDescription>Select a project to view test runs</CardDescription>
				</CardHeader>
				<CardContent>
					{projects && projects.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{projects.map((project: Project) => (
								<button
									key={project._id}
									type="button"
									onClick={() => setSelectedProjectId(project._id)}
									className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
										selectedProjectId === project._id
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground hover:bg-muted/80"
									}`}
								>
									{project.name}
								</button>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No projects found. Run tests with a reporter to create data.
						</p>
					)}
				</CardContent>
			</Card>

			{selectedProjectId && (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Filters</CardTitle>
							<CardDescription>Source and runner</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-4">
								<div>
									<label
										htmlFor="test-runs-source"
										className="text-sm font-medium text-muted-foreground block mb-1"
									>
										Source
									</label>
									<select
										id="test-runs-source"
										value={sourceFilter}
										onChange={(e) => setSourceFilter(e.target.value)}
										className="rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="all">All</option>
										<option value="ci">CI</option>
										<option value="local">Local</option>
									</select>
								</div>
								<div>
									<label
										htmlFor="test-runs-runner"
										className="text-sm font-medium text-muted-foreground block mb-1"
									>
										Runner
									</label>
									<select
										id="test-runs-runner"
										value={runnerFilter}
										onChange={(e) => setRunnerFilter(e.target.value)}
										className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
									>
										<option value="all">All</option>
										{distinctRunners.map((r) => (
											<option key={r} value={r}>
												{r}
											</option>
										))}
									</select>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Runs</CardTitle>
							<CardDescription>
								{testRuns?.length ?? 0} run{testRuns?.length !== 1 ? "s" : ""}. Select one to see
								tests.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!testRuns?.length ? (
								<EmptyState
									title="No test runs"
									description="Run tests with the Panoptes reporter (Vitest or Playwright) to see runs here."
								/>
							) : (
								<div className="space-y-2">
									{testRuns.map((run: TestRun) => {
										const isSelected = selectedRunId === run._id;
										return (
											<button
												key={run._id}
												type="button"
												onClick={() => setSelectedRunId(run._id)}
												className={`w-full text-left rounded-lg border p-4 transition-colors ${
													isSelected
														? "border-primary bg-primary/5"
														: "border-border bg-card hover:bg-muted/50"
												}`}
											>
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-sm text-muted-foreground">
														{formatTime(run.startedAt)}
													</span>
													<Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>
													<Badge variant="neutral">{run.framework}</Badge>
													<Badge variant="neutral">{run.testType}</Badge>
													{run.ci != null && (
														<Badge variant={run.ci ? "info" : "neutral"}>
															{run.ci ? "CI" : "Local"}
														</Badge>
													)}
													<span className="text-sm text-muted-foreground">
														{run.triggeredBy ?? "—"}
													</span>
													<span className="text-sm text-muted-foreground">
														{formatDuration(run.duration)}
													</span>
													<span className="text-sm text-muted-foreground">
														{run.passedTests}/{run.totalTests} passed
														{run.failedTests > 0 && `, ${run.failedTests} failed`}
													</span>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{selectedRunId && selectedRun && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Tests in this run</CardTitle>
										<CardDescription>
											{formatTime(selectedRun.startedAt)} • {selectedRun.framework} •{" "}
											{selectedRun.testType}
											{selectedRun.triggeredBy != null && ` • ${selectedRun.triggeredBy}`}
										</CardDescription>
									</div>
									<Link
										to={`/explorer?runId=${selectedRunId}`}
										className="text-sm text-primary hover:underline"
									>
										Open in Test Explorer
									</Link>
								</div>
							</CardHeader>
							<CardContent>
								{testsForRun?.length ? (
									<div className="space-y-2">
										{testsForRun.map((test: Test) => (
											<div
												key={test._id}
												className="flex items-center justify-between py-2 px-3 rounded-md border border-border bg-card"
											>
												<div>
													<div className="font-medium text-sm">{test.name}</div>
													<div className="text-xs text-muted-foreground">
														{test.file}
														{test.line != null && `:${test.line}`}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground">{test.duration}ms</span>
													<Badge variant={getStatusVariant(test.status)}>{test.status}</Badge>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">No tests in this run.</p>
								)}
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
}
