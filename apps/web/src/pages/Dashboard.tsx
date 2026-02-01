// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { ProjectSelector } from "../components/ProjectSelector";
import { ChartCard, HistoricalBarChart, HistoricalLineChart } from "../components/charts";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useProjectSelection } from "../hooks/useProjectSelection";
import { chartColors, formatPercentage, getPeriodStartTimestamp } from "../lib/chartUtils";

type TestRun = Doc<"testRuns">;
type Project = Doc<"projects">;

export default function Dashboard() {
	const [period, setPeriod] = useState("30d");
	const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
	const dashboardStats = useQuery(api.tests.getDashboardStats);
	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 10 });

	// Use the same query as TestPyramid to ensure numbers match
	const pyramidData = useQuery(
		api.tests.getTestPyramidData,
		selectedProjectId ? { projectId: selectedProjectId } : {}
	);

	// Get CI runs and PRs for the first project with a repository
	const projectWithRepo = projects?.find((p: Project) => p.repository);

	// Get historical data
	const startTimestamp = getPeriodStartTimestamp(period);
	const testRunHistory = useQuery(
		api.tests.getTestRunHistory,
		startTimestamp ? { startTimestamp, limit: 500 } : { limit: 500 }
	);
	const ciRunHistory = useQuery(
		api.github.getCIRunHistory,
		projectWithRepo && startTimestamp
			? { projectId: projectWithRepo._id, startTimestamp, limit: 500 }
			: projectWithRepo
				? { projectId: projectWithRepo._id, limit: 500 }
				: "skip"
	);

	const ciRuns = useQuery(
		api.github.getCIRunsForProject,
		projectWithRepo ? { projectId: projectWithRepo._id, limit: 5 } : "skip"
	);
	const prs = useQuery(
		api.github.getPRsForProject,
		projectWithRepo ? { projectId: projectWithRepo._id, state: "open" } : "skip"
	);

	// Prepare chart data
	const passRateData = useMemo(() => {
		if (!testRunHistory) return [];
		return testRunHistory.map((point) => ({
			date: point.date,
			value: point.passRate,
		}));
	}, [testRunHistory]);

	const testRunsByTypeData = useMemo(() => {
		if (!testRunHistory) return [];
		// Group by test type
		const byType = new Map<
			"unit" | "integration" | "e2e" | "visual",
			{ passed: number; failed: number; skipped: number }
		>();
		for (const point of testRunHistory) {
			const existing = byType.get(point.testType) || { passed: 0, failed: 0, skipped: 0 };
			existing.passed += point.passed;
			existing.failed += point.failed;
			existing.skipped += point.skipped;
			byType.set(point.testType, existing);
		}
		return Array.from(byType.entries()).map(([type, counts]) => ({
			label: type.charAt(0).toUpperCase() + type.slice(1),
			passed: counts.passed,
			failed: counts.failed,
			skipped: counts.skipped,
		}));
	}, [testRunHistory]);

	const ciSuccessRateData = useMemo(() => {
		if (!ciRunHistory) return [];
		return ciRunHistory.map((point) => ({
			date: point.date,
			value: point.successRate,
		}));
	}, [ciRunHistory]);

	if (
		dashboardStats === undefined ||
		projects === undefined ||
		testRuns === undefined ||
		pyramidData === undefined
	) {
		return (
			<div className="space-y-8">
				<div className="flex items-center justify-between flex-wrap gap-4">
					<PageHeader title="Dashboard" description="Overview of your testing pyramid" />
					<ProjectSelector
						selectedProjectId={selectedProjectId}
						onProjectSelect={setSelectedProjectId}
					/>
				</div>
				<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Card key={i}>
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-12" />
							</CardContent>
						</Card>
					))}
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-14 w-full rounded-lg" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<PageHeader title="Dashboard" description="Overview of your testing pyramid" />
				<ProjectSelector
					selectedProjectId={selectedProjectId}
					onProjectSelect={setSelectedProjectId}
				/>
			</div>

			<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
				<Link to="/test-pyramid" className="block">
					<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Projects</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{dashboardStats?.projectCount ?? 0}</div>
							<Link to="/test-pyramid" className="text-xs text-primary hover:underline mt-1 block">
								View test pyramid
							</Link>
						</CardContent>
					</Card>
				</Link>

				<Link to="/runs" className="block">
					<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Test Runs</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{dashboardStats?.testRunCount ?? 0}</div>
							<Link to="/runs" className="text-xs text-primary hover:underline mt-1 block">
								View all test runs
							</Link>
						</CardContent>
					</Card>
				</Link>

				{pyramidData && (
					<>
						<Link to="/runs?testType=unit" className="block">
							<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">Unit test definitions</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{pyramidData.unit.total}</div>
									<p className="text-xs text-muted-foreground">
										{pyramidData.unit.passed} passed, {pyramidData.unit.failed} failed
									</p>
									<Link
										to="/runs?testType=unit"
										className="text-xs text-primary hover:underline mt-1 block"
									>
										View unit tests
									</Link>
								</CardContent>
							</Card>
						</Link>

						<Link to="/runs?testType=e2e" className="block">
							<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">E2E test definitions</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{pyramidData.e2e.total}</div>
									<p className="text-xs text-muted-foreground">
										{pyramidData.e2e.passed} passed, {pyramidData.e2e.failed} failed
									</p>
									<Link
										to="/runs?testType=e2e"
										className="text-xs text-primary hover:underline mt-1 block"
									>
										View E2E tests
									</Link>
								</CardContent>
							</Card>
						</Link>
					</>
				)}

				{projectWithRepo && (
					<>
						<Link to="/ci-runs" className="block">
							<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">Recent CI Runs</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{ciRuns?.length || 0}</div>
									<Link to="/ci-runs" className="text-xs text-primary hover:underline mt-1 block">
										View all CI runs
									</Link>
								</CardContent>
							</Card>
						</Link>

						<Link to="/pull-requests" className="block">
							<Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">Open PRs</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{prs?.length || 0}</div>
									<Link
										to="/pull-requests"
										className="text-xs text-primary hover:underline mt-1 block"
									>
										View all PRs
									</Link>
								</CardContent>
							</Card>
						</Link>
					</>
				)}
			</div>

			{testRunHistory && testRunHistory.length > 0 && (
				<div className="grid gap-5 md:grid-cols-2">
					<ChartCard
						title="Pass Rate Trend"
						description="Overall test pass rate over time"
						selectedPeriod={period}
						onPeriodChange={setPeriod}
					>
						<HistoricalLineChart
							data={passRateData}
							yAxisLabel="Pass Rate (%)"
							valueFormatter={formatPercentage}
							showArea
							color={chartColors.success}
							height={250}
						/>
					</ChartCard>

					{testRunsByTypeData.length > 0 && (
						<ChartCard title="Test Runs by Type" description="Total test executions by test type">
							<HistoricalBarChart data={testRunsByTypeData} stacked height={250} />
						</ChartCard>
					)}
				</div>
			)}

			{projectWithRepo && ciRunHistory && ciRunHistory.length > 0 && (
				<ChartCard
					title="CI Success Rate"
					description="GitHub Actions workflow success rate over time"
					selectedPeriod={period}
					onPeriodChange={setPeriod}
				>
					<HistoricalLineChart
						data={ciSuccessRateData}
						yAxisLabel="Success Rate (%)"
						valueFormatter={formatPercentage}
						showArea
						color={chartColors.success}
						height={250}
					/>
				</ChartCard>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Recent Test Runs</CardTitle>
					<CardDescription>Latest test execution results</CardDescription>
				</CardHeader>
				<CardContent>
					{testRuns && testRuns.length > 0 ? (
						<div className="space-y-2">
							{testRuns.map((run: TestRun) => (
								<Link
									key={run._id}
									to={`/runs/${run._id}`}
									className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
								>
									<div>
										<div className="font-medium">
											{run.framework} - {run.testType}
										</div>
										<div className="text-sm text-muted-foreground">
											{new Date(run.startedAt).toLocaleString()}
										</div>
									</div>
									<div className="text-right flex items-center gap-2">
										<Badge
											variant={
												run.status === "passed"
													? "success"
													: run.status === "failed"
														? "error"
														: "neutral"
											}
										>
											{run.status}
										</Badge>
										<span className="text-sm text-muted-foreground">
											{run.passedTests}/{run.totalTests} passed
										</span>
									</div>
								</Link>
							))}
						</div>
					) : (
						<EmptyState
							title="No test runs yet"
							description="Run your tests with a Panoptes reporter to see results here."
							image="/panoptes_under_fruit_tree.png"
							action={
								<a
									href="https://github.com/your-org/panoptes#reporters"
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm font-medium text-primary hover:underline"
								>
									View reporter docs →
								</a>
							}
						/>
					)}
				</CardContent>
			</Card>

			{projectWithRepo && (
				<div className="grid gap-5 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Recent CI Runs</CardTitle>
							<CardDescription>Latest GitHub Actions workflow runs</CardDescription>
						</CardHeader>
						<CardContent>
							{ciRuns && ciRuns.length > 0 ? (
								<div className="space-y-2">
									{ciRuns.slice(0, 5).map((run) => (
										<div
											key={run._id}
											className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
										>
											<div>
												<div className="font-medium text-sm">{run.workflowName}</div>
												<div className="text-xs text-muted-foreground">
													{run.branch} • {run.commitSha.substring(0, 7)}
												</div>
											</div>
											<Badge
												variant={
													run.conclusion === "success"
														? "success"
														: run.conclusion === "failure"
															? "error"
															: "neutral"
												}
											>
												{run.conclusion || run.status}
											</Badge>
										</div>
									))}
									<Link
										to="/ci-runs"
										className="block text-center text-sm text-primary hover:underline mt-2"
									>
										View all CI runs →
									</Link>
								</div>
							) : (
								<EmptyState
									title="No CI runs found"
									description="Sync GitHub data to fetch workflow runs for this project."
									action={
										<Link
											to="/ci-runs"
											className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
										>
											Sync GitHub data
										</Link>
									}
								/>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Open Pull Requests</CardTitle>
							<CardDescription>Pull requests from GitHub</CardDescription>
						</CardHeader>
						<CardContent>
							{prs && prs.length > 0 ? (
								<div className="space-y-2">
									{prs.slice(0, 5).map((pr) => (
										<div
											key={pr._id}
											className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
										>
											<div>
												<div className="font-medium text-sm">
													#{pr.prNumber}: {pr.title}
												</div>
												<div className="text-xs text-muted-foreground">
													{pr.author} • {pr.branch} → {pr.baseBranch}
												</div>
											</div>
											<Badge variant={pr.state === "open" ? "success" : "neutral"}>
												{pr.state}
											</Badge>
										</div>
									))}
									<Link
										to="/pull-requests"
										className="block text-center text-sm text-primary hover:underline mt-2"
									>
										View all PRs →
									</Link>
								</div>
							) : (
								<EmptyState
									title="No open PRs found"
									description="Sync GitHub data to fetch pull requests for this project."
									action={
										<Link
											to="/pull-requests"
											className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
										>
											Sync GitHub data
										</Link>
									}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
