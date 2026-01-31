// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type TestRun = Doc<"testRuns">;
type Project = Doc<"projects">;

export default function Dashboard() {
	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 10 });
	const pyramidData = useQuery(api.tests.getTestPyramidData, {});

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

	if (projects === undefined || testRuns === undefined) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">Overview of your testing pyramid</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Projects</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{projects?.length || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Recent Test Runs</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{testRuns?.length || 0}</div>
					</CardContent>
				</Card>

				{pyramidData && (
					<>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Unit Tests</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{pyramidData.unit.total}</div>
								<p className="text-xs text-muted-foreground">
									{pyramidData.unit.passed} passed, {pyramidData.unit.failed} failed
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">E2E Tests</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{pyramidData.e2e.total}</div>
								<p className="text-xs text-muted-foreground">
									{pyramidData.e2e.passed} passed, {pyramidData.e2e.failed} failed
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
								<Link to="/ci-runs" className="text-xs text-blue-600 hover:text-blue-800 underline">
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
								<Link
									to="/pull-requests"
									className="text-xs text-blue-600 hover:text-blue-800 underline"
								>
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
								<div key={run._id} className="flex items-center justify-between p-2 border rounded">
									<div>
										<div className="font-medium">
											{run.framework} - {run.testType}
										</div>
										<div className="text-sm text-muted-foreground">
											{new Date(run.startedAt).toLocaleString()}
										</div>
									</div>
									<div className="text-right">
										<div
											className={`font-medium ${
												run.status === "passed"
													? "text-green-600"
													: run.status === "failed"
														? "text-red-600"
														: "text-gray-600"
											}`}
										>
											{run.status}
										</div>
										<div className="text-sm text-muted-foreground">
											{run.passedTests}/{run.totalTests} passed
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No test runs yet. Run your tests with a Panoptes reporter to see results here.
						</p>
					)}
				</CardContent>
			</Card>

			{projectWithRepo && (
				<div className="grid gap-4 md:grid-cols-2">
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
											className="flex items-center justify-between p-2 border rounded"
										>
											<div>
												<div className="font-medium text-sm">{run.workflowName}</div>
												<div className="text-xs text-muted-foreground">
													{run.branch} • {run.commitSha.substring(0, 7)}
												</div>
											</div>
											<div className="text-right">
												<span
													className={`text-xs px-2 py-1 rounded ${
														run.conclusion === "success"
															? "bg-green-100 text-green-800"
															: run.conclusion === "failure"
																? "bg-red-100 text-red-800"
																: "bg-gray-100 text-gray-800"
													}`}
												>
													{run.conclusion || run.status}
												</span>
											</div>
										</div>
									))}
									<Link
										to="/ci-runs"
										className="block text-center text-sm text-blue-600 hover:text-blue-800 underline mt-2"
									>
										View all CI runs →
									</Link>
								</div>
							) : (
								<p className="text-muted-foreground text-sm">
									No CI runs found.{" "}
									<Link to="/ci-runs" className="text-blue-600 hover:text-blue-800 underline">
										Sync GitHub data
									</Link>
								</p>
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
											className="flex items-center justify-between p-2 border rounded"
										>
											<div>
												<div className="font-medium text-sm">
													#{pr.prNumber}: {pr.title}
												</div>
												<div className="text-xs text-muted-foreground">
													{pr.author} • {pr.branch} → {pr.baseBranch}
												</div>
											</div>
											<span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
												{pr.state}
											</span>
										</div>
									))}
									<Link
										to="/pull-requests"
										className="block text-center text-sm text-blue-600 hover:text-blue-800 underline mt-2"
									>
										View all PRs →
									</Link>
								</div>
							) : (
								<p className="text-muted-foreground text-sm">
									No open PRs found.{" "}
									<Link to="/pull-requests" className="text-blue-600 hover:text-blue-800 underline">
										Sync GitHub data
									</Link>
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
