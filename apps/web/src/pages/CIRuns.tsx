// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { GitHubPageHeader } from "../components/GitHubPageHeader";
import { ProjectSelector } from "../components/ProjectSelector";
import { RepositoryConfig } from "../components/RepositoryConfig";
import { ChartCard, HistoricalLineChart } from "../components/charts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useGitHubSync } from "../hooks/useGitHubSync";
import { useProjectSelection } from "../hooks/useProjectSelection";
import {
	chartColors,
	formatDuration,
	formatPercentage,
	getPeriodStartTimestamp,
} from "../lib/chartUtils";

type CIRun = Doc<"ciRuns">;

export default function CIRuns() {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [showRepoConfig, setShowRepoConfig] = useState(false);
	const [period, setPeriod] = useState("30d");

	const { selectedProjectId, setSelectedProjectId, selectedProject } = useProjectSelection();
	const { handleSync } = useGitHubSync({
		projectId: selectedProjectId,
		onRepositoryNotConfigured: () => setShowRepoConfig(true),
	});

	const ciRuns = useQuery(
		api.github.getCIRunsForProject,
		selectedProjectId ? { projectId: selectedProjectId, limit: 50 } : "skip"
	);

	// Get historical data
	const startTimestamp = getPeriodStartTimestamp(period);
	const ciRunHistory = useQuery(
		api.github.getCIRunHistory,
		selectedProjectId && startTimestamp
			? { projectId: selectedProjectId, startTimestamp, limit: 500 }
			: selectedProjectId
				? { projectId: selectedProjectId, limit: 500 }
				: "skip"
	);

	// Prepare chart data
	const successRateData = useMemo(() => {
		if (!ciRunHistory) return [];
		return ciRunHistory.map((point) => ({
			date: point.date,
			value: point.successRate,
		}));
	}, [ciRunHistory]);

	const durationData = useMemo(() => {
		if (!ciRunHistory) return [];
		return ciRunHistory
			.filter((point) => point.duration > 0)
			.map((point) => ({
				date: point.date,
				value: point.duration / 1000, // Convert to seconds
			}));
	}, [ciRunHistory]);

	const filteredRuns = ciRuns?.filter((run: CIRun) => {
		if (statusFilter === "all") return true;
		if (statusFilter === "success") return run.conclusion === "success";
		if (statusFilter === "failure") return run.conclusion === "failure";
		return run.status === statusFilter;
	});

	const getStatusVariant = (
		status: string,
		conclusion?: string
	): "success" | "error" | "info" | "neutral" => {
		if (conclusion === "success") return "success";
		if (conclusion === "failure") return "error";
		if (status === "in_progress" || status === "queued") return "info";
		return "neutral";
	};

	const getStatusLabel = (status: string, conclusion?: string) => {
		if (conclusion) return conclusion;
		return status;
	};

	return (
		<div className="space-y-8">
			<GitHubPageHeader
				title="CI Runs"
				description="GitHub Actions workflow runs"
				onSync={handleSync}
				showSyncButton={!!selectedProjectId}
			/>

			<ProjectSelector
				selectedProjectId={selectedProjectId}
				onProjectSelect={setSelectedProjectId}
				description="Select a project to view CI runs"
			/>

			{selectedProject && !selectedProject.repository && (
				<RepositoryConfig
					projectId={selectedProject._id}
					description="Select a GitHub repository for this project to view CI runs"
					compact={!showRepoConfig}
				/>
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

					{ciRunHistory && ciRunHistory.length > 0 && (
						<div className="grid gap-5 md:grid-cols-2">
							<ChartCard
								title="CI Success Rate"
								description="Workflow success/failure rate over time"
								selectedPeriod={period}
								onPeriodChange={setPeriod}
							>
								<HistoricalLineChart
									data={successRateData}
									yAxisLabel="Success Rate (%)"
									valueFormatter={formatPercentage}
									showArea
									color={chartColors.success}
									height={250}
								/>
							</ChartCard>

							{durationData.length > 0 && (
								<ChartCard
									title="Build Duration Trend"
									description="Average CI build duration over time"
									selectedPeriod={period}
									onPeriodChange={setPeriod}
								>
									<HistoricalLineChart
										data={durationData}
										yAxisLabel="Duration (s)"
										valueFormatter={(v) => formatDuration(v * 1000)}
										showArea
										color={chartColors.info}
										height={250}
									/>
								</ChartCard>
							)}
						</div>
					)}

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
									title="No CI runs found"
									description="Click Sync GitHub Data to fetch workflow runs from GitHub for this project."
									action={
										<Button onClick={handleSync} variant="default" size="sm">
											Sync GitHub Data
										</Button>
									}
								/>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
