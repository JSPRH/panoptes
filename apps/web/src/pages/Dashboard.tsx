// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Dashboard() {
	const projects = useQuery(api.tests.getProjects);
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 10 });
	const pyramidData = useQuery(api.tests.getTestPyramidData);

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
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Test Runs</CardTitle>
					<CardDescription>Latest test execution results</CardDescription>
				</CardHeader>
				<CardContent>
					{testRuns && testRuns.length > 0 ? (
						<div className="space-y-2">
							{testRuns.map((run) => (
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
		</div>
	);
}
