// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type CIRun = Doc<"ciRuns">;
type Project = Doc<"projects">;

export default function CIRuns() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const projects = useQuery(api.tests.getProjects);
	const syncGitHubData = useAction(api.github.syncProjectGitHubData);

	const ciRuns = useQuery(
		api.github.getCIRunsForProject,
		selectedProjectId ? { projectId: selectedProjectId, limit: 50 } : "skip"
	);

	const selectedProject = projects?.find((p) => p._id === selectedProjectId);

	const handleSync = async () => {
		if (!selectedProjectId) return;
		try {
			await syncGitHubData({ projectId: selectedProjectId });
			alert("GitHub data synced successfully!");
		} catch (error) {
			console.error("Failed to sync GitHub data:", error);
			alert(`Failed to sync: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const filteredRuns = ciRuns?.filter((run: CIRun) => {
		if (statusFilter === "all") return true;
		if (statusFilter === "success") return run.conclusion === "success";
		if (statusFilter === "failure") return run.conclusion === "failure";
		return run.status === statusFilter;
	});

	const getStatusColor = (status: string, conclusion?: string) => {
		if (conclusion === "success") return "text-green-600 bg-green-100";
		if (conclusion === "failure") return "text-red-600 bg-red-100";
		if (status === "in_progress" || status === "queued") return "text-blue-600 bg-blue-100";
		return "text-gray-600 bg-gray-100";
	};

	const getStatusLabel = (status: string, conclusion?: string) => {
		if (conclusion) return conclusion;
		return status;
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">CI Runs</h1>
					<p className="text-muted-foreground">GitHub Actions workflow runs</p>
				</div>
				{selectedProjectId && (
					<Button onClick={handleSync} variant="outline" size="sm">
						Sync GitHub Data
					</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Project Selection</CardTitle>
					<CardDescription>Select a project to view CI runs</CardDescription>
				</CardHeader>
				<CardContent>
					{projects && projects.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{projects.map((project: Project) => (
								<Button
									key={project._id}
									variant={selectedProjectId === project._id ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedProjectId(project._id as Id<"projects">)}
								>
									{project.name}
									{!project.repository && (
										<span className="ml-2 text-xs text-yellow-600">(no repo)</span>
									)}
								</Button>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">No projects found. Create a project first.</p>
					)}
				</CardContent>
			</Card>

			{selectedProject && !selectedProject.repository && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">
							This project doesn't have a repository configured. Add a repository URL to view CI
							runs.
						</p>
					</CardContent>
				</Card>
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
										<div
											key={run._id}
											className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<div className="font-medium">{run.workflowName}</div>
													<span
														className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
															run.status,
															run.conclusion || undefined
														)}`}
													>
														{getStatusLabel(run.status, run.conclusion || undefined)}
													</span>
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
													className="text-sm text-blue-600 hover:text-blue-800 underline"
												>
													View on GitHub
												</a>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground">
									No CI runs found. Click "Sync GitHub Data" to fetch runs from GitHub.
								</p>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
