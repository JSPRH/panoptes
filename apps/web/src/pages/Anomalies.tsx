// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

type Anomaly = Doc<"anomalies">;
type Project = Doc<"projects">;

export default function Anomalies() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisError, setAnalysisError] = useState<string | null>(null);
	const [overallInsights, setOverallInsights] = useState<{
		summary: string;
		keyPatterns: string[];
		recommendations: string[];
		priorityActions: string[];
	} | null>(null);

	const projects = useQuery(api.tests.getProjects);
	const anomalies = useQuery(
		api.anomalies.getAnomalies,
		selectedProjectId ? { projectId: selectedProjectId, resolved: false } : "skip"
	);
	const resolveAnomaly = useMutation(api.anomalies.resolveAnomaly);
	const analyzeAnomalies = useAction(api.anomaliesActions.analyzeAnomalies);

	// Auto-select first project if only one exists
	useEffect(() => {
		if (projects && projects.length === 1 && !selectedProjectId) {
			setSelectedProjectId(projects[0]._id);
		}
	}, [projects, selectedProjectId]);

	const handleResolve = async (anomalyId: string) => {
		await resolveAnomaly({ anomalyId: anomalyId as Anomaly["_id"] });
	};

	const handleAnalyze = async () => {
		if (!selectedProjectId) return;

		setIsAnalyzing(true);
		setAnalysisError(null);
		setOverallInsights(null);

		try {
			const result = await analyzeAnomalies({ projectId: selectedProjectId });
			if (result.overallInsights) {
				setOverallInsights(result.overallInsights);
			}
		} catch (error) {
			console.error("Failed to analyze anomalies:", error);
			setAnalysisError(error instanceof Error ? error.message : "Failed to analyze anomalies");
		} finally {
			setIsAnalyzing(false);
		}
	};

	const groupedAnomalies = {
		flaky: anomalies?.filter((a: Anomaly) => a.type === "flaky") || [],
		slow: anomalies?.filter((a: Anomaly) => a.type === "slow") || [],
		frequently_failing: anomalies?.filter((a: Anomaly) => a.type === "frequently_failing") || [],
		resource_intensive: anomalies?.filter((a: Anomaly) => a.type === "resource_intensive") || [],
	};

	const getSeverityVariant = (severity: string): "error" | "warning" | "info" | "neutral" => {
		switch (severity) {
			case "high":
				return "error";
			case "medium":
				return "warning";
			case "low":
				return "info";
			default:
				return "neutral";
		}
	};

	const hasMultipleProjects = projects && projects.length > 1;

	return (
		<div className="space-y-8">
			<PageHeader title="Anomaly Detection" description="Detected issues in your test suite" />

			{hasMultipleProjects && (
				<Card>
					<CardHeader>
						<CardTitle>Project</CardTitle>
						<CardDescription>Select a project to view anomalies</CardDescription>
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
				<Card>
					<CardHeader>
						<CardTitle>Analysis</CardTitle>
						<CardDescription>
							Analyze anomalies using AI to get actionable insights and recommendations
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full sm:w-auto">
							{isAnalyzing ? "Analyzing..." : "Analyze Anomalies"}
						</Button>
						{analysisError && (
							<div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
								{analysisError}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{overallInsights && (
				<Card>
					<CardHeader>
						<CardTitle>Overall Insights</CardTitle>
						<CardDescription>AI-generated analysis of your test suite</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h4 className="font-semibold mb-2">Summary</h4>
							<p className="text-sm text-muted-foreground">{overallInsights.summary}</p>
						</div>
						{overallInsights.keyPatterns.length > 0 && (
							<div>
								<h4 className="font-semibold mb-2">Key Patterns</h4>
								<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
									{overallInsights.keyPatterns.map((pattern) => (
										<li key={pattern}>{pattern}</li>
									))}
								</ul>
							</div>
						)}
						{overallInsights.recommendations.length > 0 && (
							<div>
								<h4 className="font-semibold mb-2">Recommendations</h4>
								<ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
									{overallInsights.recommendations.map((rec) => (
										<li key={rec}>{rec}</li>
									))}
								</ul>
							</div>
						)}
						{overallInsights.priorityActions.length > 0 && (
							<div>
								<h4 className="font-semibold mb-2">Priority Actions</h4>
								<ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
									{overallInsights.priorityActions.map((action) => (
										<li key={action}>{action}</li>
									))}
								</ol>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle>Flaky Tests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.flaky.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Slow Tests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.slow.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Frequently Failing</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.frequently_failing.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Resource Intensive</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.resource_intensive.length}</div>
					</CardContent>
				</Card>
			</div>

			{selectedProjectId ? (
				<Card>
					<CardHeader>
						<CardTitle>All Anomalies</CardTitle>
						<CardDescription>
							{anomalies === undefined ? (
								<Skeleton className="h-4 w-32" />
							) : (
								<>
									{anomalies.length} unresolved anomal{anomalies.length !== 1 ? "ies" : "y"}
								</>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{anomalies === undefined ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-16 w-full rounded-lg" />
								))}
							</div>
						) : anomalies.length > 0 ? (
							<div className="space-y-4">
								{anomalies.map((anomaly: Anomaly) => (
									<div key={anomaly._id} className="space-y-2">
										<div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
											<div className="flex-1 flex items-center gap-2 flex-wrap">
												<div className="font-medium">{anomaly.testName}</div>
												<Badge variant={getSeverityVariant(anomaly.severity)}>
													{anomaly.severity}
												</Badge>
												<Badge variant="neutral">{anomaly.type.replace("_", " ")}</Badge>
												{anomaly.details && (
													<span className="text-xs text-muted-foreground">
														{anomaly.type === "slow" &&
															typeof anomaly.details.averageDuration === "number" &&
															`Avg: ${(anomaly.details.averageDuration / 1000).toFixed(2)}s`}
														{anomaly.type === "flaky" &&
															typeof anomaly.details.passRate === "number" &&
															` Pass: ${(anomaly.details.passRate * 100).toFixed(1)}%`}
														{anomaly.type === "frequently_failing" &&
															typeof anomaly.details.failureRate === "number" &&
															` Fail: ${(anomaly.details.failureRate * 100).toFixed(1)}%`}
													</span>
												)}
												{anomaly.confidence !== undefined && (
													<Badge variant="neutral" className="text-xs">
														Confidence: {(anomaly.confidence * 100).toFixed(0)}%
													</Badge>
												)}
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleResolve(anomaly._id)}
											>
												Resolve
											</Button>
										</div>
										{anomaly.insights && (
											<Card className="ml-4 border-l-4 border-l-primary">
												<CardHeader className="pb-2">
													<CardTitle className="text-sm">AI Insights</CardTitle>
												</CardHeader>
												<CardContent className="space-y-2">
													<p className="text-sm text-muted-foreground">{anomaly.insights}</p>
													{anomaly.rootCause && (
														<div>
															<h5 className="text-xs font-semibold mb-1">Root Cause:</h5>
															<p className="text-xs text-muted-foreground">{anomaly.rootCause}</p>
														</div>
													)}
													{anomaly.suggestedFix && (
														<div>
															<h5 className="text-xs font-semibold mb-1">Suggested Fix:</h5>
															<p className="text-xs text-muted-foreground">
																{anomaly.suggestedFix}
															</p>
														</div>
													)}
												</CardContent>
											</Card>
										)}
									</div>
								))}
							</div>
						) : (
							<EmptyState
								title="No anomalies detected"
								description="Your test suite looks healthy. Anomalies will appear here when flaky, slow, or frequently failing tests are detected."
							/>
						)}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="py-8">
						<EmptyState
							title="Select a project"
							description="Select a project above to view and analyze anomalies."
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
