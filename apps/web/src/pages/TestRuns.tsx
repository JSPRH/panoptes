// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type TestRun = Doc<"testRuns">;
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
	const [searchParams] = useSearchParams();
	const urlTestType = searchParams.get("testType");

	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [sourceFilter, setSourceFilter] = useState<string>("all");
	const [runnerFilter, setRunnerFilter] = useState<string>("all");

	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(
		api.tests.getTestRuns,
		selectedProjectId
			? {
					projectId: selectedProjectId,
					testType:
						urlTestType && ["unit", "integration", "e2e", "visual"].includes(urlTestType)
							? (urlTestType as "unit" | "integration" | "e2e" | "visual")
							: undefined,
					ci: sourceFilter === "ci" ? true : sourceFilter === "local" ? false : undefined,
					triggeredBy: runnerFilter === "all" ? undefined : runnerFilter,
					limit: 100,
				}
			: "skip"
	);

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

	const getStatusVariant = (status: string): "success" | "error" | "info" | "neutral" => {
		if (status === "passed") return "success";
		if (status === "failed") return "error";
		if (status === "running") return "info";
		return "neutral";
	};

	const hasMultipleProjects = projects && projects.length > 1;

	const testTypeFilter =
		urlTestType && ["unit", "integration", "e2e", "visual"].includes(urlTestType)
			? urlTestType.charAt(0).toUpperCase() + urlTestType.slice(1)
			: null;

	return (
		<div className="space-y-8">
			<PageHeader
				title={testTypeFilter ? `${testTypeFilter} Test Runs` : "Test Runs"}
				description={
					testTypeFilter
						? `Browse ${testTypeFilter.toLowerCase()} test runs by project, source (CI/Local), and runner. Open a run to view its test executions.`
						: "Browse test runs by project, source (CI/Local), and runner. Open a run to view its test executions."
				}
			/>

			{hasMultipleProjects && (
				<Card>
					<CardHeader>
						<CardTitle>Project</CardTitle>
						<CardDescription>Select a project to view test runs</CardDescription>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>
			)}

			{projects && projects.length === 0 && (
				<p className="text-muted-foreground">
					No projects found. Run tests with a reporter to create data.
				</p>
			)}

			{selectedProjectId && (
				<>
					{testTypeFilter && (
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">Filtered by:</span>
									<Badge variant="neutral">{testTypeFilter}</Badge>
									<Link to="/runs" className="text-sm text-primary hover:underline ml-auto">
										Clear filter
									</Link>
								</div>
							</CardContent>
						</Card>
					)}

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
								{testRuns?.length ?? 0} run{testRuns?.length !== 1 ? "s" : ""}. Open a run to view
								details.
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
									{testRuns.map((run: TestRun) => (
										<Link
											key={run._id}
											to={`/runs/${run._id}`}
											className="block w-full text-left rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
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
