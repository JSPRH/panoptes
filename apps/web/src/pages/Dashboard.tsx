// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

type TestRun = Doc<"testRuns">;
type Project = Doc<"projects">;

export default function Dashboard() {
	const dashboardStats = useQuery(api.tests.getDashboardStats);
	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 10 });

	// Get CI runs and PRs for the first project with a repository
	const projectWithRepo = projects?.find((p: Project) => p.repository);
	const ciRuns = useQuery(
		api.github.getCIRunsForProject,
		projectWithRepo ? { projectId: projectWithRepo._id, limit: 5 } : "skip"
	);
	const prs = useQuery(
		api.github.getPRsForProject,
		projectWithRepo ? { projectId: projectWithRepo._id, state: "open" } : "skip"
	);

	if (dashboardStats === undefined || projects === undefined || testRuns === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Dashboard" description="Overview of your testing pyramid" />
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
			<PageHeader title="Dashboard" description="Overview of your testing pyramid" />

			<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Projects</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{dashboardStats?.projectCount ?? 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Test Runs</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{dashboardStats?.testRunCount ?? 0}</div>
					</CardContent>
				</Card>

				{dashboardStats && (
					<>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Unit test definitions</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{dashboardStats.pyramid.unit.total}</div>
								<p className="text-xs text-muted-foreground">
									{dashboardStats.pyramid.unit.passed} passed, {dashboardStats.pyramid.unit.failed}{" "}
									failed
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">E2E test definitions</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{dashboardStats.pyramid.e2e.total}</div>
								<p className="text-xs text-muted-foreground">
									{dashboardStats.pyramid.e2e.passed} passed, {dashboardStats.pyramid.e2e.failed}{" "}
									failed
								</p>
							</CardContent>
						</Card>
					</>
				)}

				{projectWithRepo && (
					<>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Recent CI Runs</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{ciRuns?.length || 0}</div>
								<Link to="/ci-runs" className="text-xs text-primary hover:underline">
									View all CI runs
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Open PRs</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{prs?.length || 0}</div>
								<Link to="/pull-requests" className="text-xs text-primary hover:underline">
									View all PRs
								</Link>
							</CardContent>
						</Card>
					</>
				)}
			</div>

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
