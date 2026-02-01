// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { ProjectSelector } from "../components/ProjectSelector";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useProjectSelection } from "../hooks/useProjectSelection";

type Feature = Doc<"features"> & {
	testCount: number;
	confirmedTestCount: number;
	avgConfidence: number;
};

type FeatureWithTests = {
	feature: Doc<"features">;
	tests: Array<{
		mapping: Doc<"testFeatureMappings">;
		testName: string;
		testFile: string;
		testLine?: number;
		testType?: string;
		testStatus?: string;
	}>;
};

// biome-ignore lint/suspicious/noExplicitAny: API types not generated yet for new tables
const featuresApi = (api as any).features;
// biome-ignore lint/suspicious/noExplicitAny: API types not generated yet for new tables
const codebaseAnalysisApi = (api as any).codebaseAnalysisActions;

export default function FeatureExplorer() {
	const { selectedProjectId, setSelectedProjectId, projects } = useProjectSelection();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [expandedFeatureId, setExpandedFeatureId] = useState<Id<"features"> | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [activeTab, setActiveTab] = useState("all");

	// Queries - using dynamic API access since types aren't generated yet
	const features = useQuery(
		featuresApi?.getFeatures,
		selectedProjectId
			? { projectId: selectedProjectId, category: selectedCategory || undefined }
			: "skip"
	) as Feature[] | undefined;

	const categories = useQuery(
		featuresApi?.getCategories,
		selectedProjectId ? { projectId: selectedProjectId } : "skip"
	) as string[] | undefined;

	const uncoveredFeatures = useQuery(
		featuresApi?.getUncoveredFeatures,
		selectedProjectId ? { projectId: selectedProjectId, maxTestCount: 0 } : "skip"
	) as (Doc<"features"> & { testCount: number })[] | undefined;

	const featureStats = useQuery(
		featuresApi?.getFeatureStats,
		selectedProjectId ? { projectId: selectedProjectId } : "skip"
	) as
		| {
				totalFeatures: number;
				totalMappings: number;
				uncoveredCount: number;
				lowCoverageCount: number;
				categoryCounts: Record<string, number>;
		  }
		| undefined;

	const latestAnalysis = useQuery(
		featuresApi?.getLatestAnalysis,
		selectedProjectId ? { projectId: selectedProjectId } : "skip"
	) as Doc<"codebaseAnalysis"> | null | undefined;

	const expandedFeature = useQuery(
		featuresApi?.getFeatureWithTests,
		expandedFeatureId ? { featureId: expandedFeatureId } : "skip"
	) as FeatureWithTests | null | undefined;

	// Actions and mutations
	const startAnalysis = useAction(codebaseAnalysisApi?.startCodebaseAnalysis);
	const archiveFeature = useMutation(featuresApi?.archiveFeature);
	const confirmMapping = useMutation(featuresApi?.confirmTestMapping);

	const handleStartAnalysis = async (forceRefresh = false) => {
		if (!selectedProjectId) return;
		setIsAnalyzing(true);
		try {
			await startAnalysis({ projectId: selectedProjectId, forceRefresh });
		} catch (error) {
			console.error("Failed to start analysis:", error);
			alert(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleArchiveFeature = async (featureId: Id<"features">) => {
		if (!confirm("Are you sure you want to archive this feature?")) return;
		await archiveFeature({ featureId });
		if (expandedFeatureId === featureId) {
			setExpandedFeatureId(null);
		}
	};

	const handleConfirmMapping = async (mappingId: Id<"testFeatureMappings">, confirmed: boolean) => {
		await confirmMapping({ mappingId, confirmed });
	};

	const renderAnalysisStatus = () => {
		if (!latestAnalysis) return null;

		const statusColors: Record<string, string> = {
			pending: "bg-yellow-100 text-yellow-800",
			running: "bg-blue-100 text-blue-800",
			completed: "bg-green-100 text-green-800",
			failed: "bg-red-100 text-red-800",
		};

		return (
			<div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Last Analysis:</span>
					<Badge className={statusColors[latestAnalysis.status] || ""}>
						{latestAnalysis.status}
					</Badge>
				</div>
				{latestAnalysis.progress && latestAnalysis.status === "running" && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">
							{latestAnalysis.progress.phase} ({latestAnalysis.progress.current}/
							{latestAnalysis.progress.total})
						</span>
						<LoadingSpinner />
					</div>
				)}
				{latestAnalysis.status === "completed" && (
					<div className="text-sm text-muted-foreground">
						{latestAnalysis.featuresDiscovered} features discovered, {latestAnalysis.testsMapped}{" "}
						tests mapped
					</div>
				)}
				{latestAnalysis.error && (
					<div className="text-sm text-destructive">{latestAnalysis.error}</div>
				)}
			</div>
		);
	};

	const renderFeatureCard = (feature: Feature) => {
		const isExpanded = expandedFeatureId === feature._id;

		return (
			<div key={feature._id} className="border rounded-lg overflow-hidden">
				<div
					className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
					onClick={() => setExpandedFeatureId(isExpanded ? null : feature._id)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setExpandedFeatureId(isExpanded ? null : feature._id);
						}
					}}
				>
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span className="font-medium">{feature.name}</span>
							{feature.category && (
								<Badge variant="neutral" className="text-xs">
									{feature.category}
								</Badge>
							)}
							{feature.isUserDefined && (
								<Badge variant="info" className="text-xs">
									User Defined
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
						{feature.userJourney && (
							<p className="text-xs text-muted-foreground mt-1">Journey: {feature.userJourney}</p>
						)}
					</div>
					<div className="flex items-center gap-4">
						<div className="text-right">
							<div className="text-sm font-medium">{feature.testCount} tests</div>
							<div className="text-xs text-muted-foreground">
								{feature.confirmedTestCount} confirmed
							</div>
						</div>
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
								feature.testCount === 0
									? "bg-red-100 text-red-700"
									: feature.testCount <= 2
										? "bg-yellow-100 text-yellow-700"
										: "bg-green-100 text-green-700"
							}`}
						>
							{Math.round(feature.avgConfidence * 100)}%
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								handleArchiveFeature(feature._id);
							}}
						>
							Archive
						</Button>
					</div>
				</div>

				{isExpanded && expandedFeature && (
					<div className="border-t p-4 bg-muted/30">
						<div className="space-y-4">
							<div>
								<h4 className="text-sm font-medium mb-2">Related Files</h4>
								<div className="flex flex-wrap gap-2">
									{feature.relatedFiles.slice(0, 10).map((file: string) => (
										<Badge key={file} variant="neutral" className="text-xs font-mono">
											{file}
										</Badge>
									))}
									{feature.relatedFiles.length > 10 && (
										<Badge variant="neutral" className="text-xs">
											+{feature.relatedFiles.length - 10} more
										</Badge>
									)}
								</div>
							</div>

							{expandedFeature.tests.length > 0 ? (
								<div>
									<h4 className="text-sm font-medium mb-2">Mapped Tests</h4>
									<div className="space-y-2">
										{expandedFeature.tests.map((test) => (
											<div
												key={test.mapping._id}
												className="flex items-center justify-between p-2 bg-background rounded border"
											>
												<div className="flex-1">
													<div className="font-mono text-sm">{test.testName}</div>
													<div className="text-xs text-muted-foreground">
														{test.testFile}
														{test.testLine && `:${test.testLine}`}
														{test.testType && ` (${test.testType})`}
													</div>
													<div className="text-xs text-muted-foreground italic mt-1">
														{test.mapping.reason}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Badge
														variant={
															test.testStatus === "passed"
																? "success"
																: test.testStatus === "failed"
																	? "error"
																	: "neutral"
														}
													>
														{test.testStatus || "unknown"}
													</Badge>
													<div className="text-sm text-muted-foreground">
														{Math.round(test.mapping.confidence * 100)}%
													</div>
													{!test.mapping.isUserConfirmed && (
														<div className="flex gap-1">
															<Button
																variant="outline"
																size="sm"
																className="text-xs h-6"
																onClick={() => handleConfirmMapping(test.mapping._id, true)}
															>
																Confirm
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="text-xs h-6 text-destructive"
																onClick={() => handleConfirmMapping(test.mapping._id, false)}
															>
																Reject
															</Button>
														</div>
													)}
													{test.mapping.isUserConfirmed && (
														<Badge variant="success" className="text-xs">
															Confirmed
														</Badge>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-sm text-muted-foreground italic">
									No tests mapped to this feature yet.
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	};

	if (!projects) {
		return <LoadingSpinner />;
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<PageHeader
					title="Feature Explorer"
					description="View tests organized by features and user journeys"
				/>
				<div className="flex items-center gap-4">
					<ProjectSelector
						selectedProjectId={selectedProjectId}
						onProjectSelect={setSelectedProjectId}
					/>
					{selectedProjectId && (
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => handleStartAnalysis(false)}
								disabled={isAnalyzing || latestAnalysis?.status === "running"}
							>
								{latestAnalysis?.status === "running" ? "Analyzing..." : "Analyze Codebase"}
							</Button>
							{latestAnalysis?.status === "completed" && (
								<Button
									variant="ghost"
									onClick={() => handleStartAnalysis(true)}
									disabled={isAnalyzing}
								>
									Refresh
								</Button>
							)}
						</div>
					)}
				</div>
			</div>

			{!selectedProjectId ? (
				<Card>
					<CardContent className="pt-6">
						<EmptyState
							title="Select a Project"
							description="Choose a project to explore its features and test coverage."
						/>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Analysis Status */}
					{renderAnalysisStatus()}

					{/* Stats Overview */}
					{featureStats && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl">{featureStats.totalFeatures}</CardTitle>
									<CardDescription>Total Features</CardDescription>
								</CardHeader>
							</Card>
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl">{featureStats.totalMappings}</CardTitle>
									<CardDescription>Test Mappings</CardDescription>
								</CardHeader>
							</Card>
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl text-red-600">
										{featureStats.uncoveredCount}
									</CardTitle>
									<CardDescription>Uncovered Features</CardDescription>
								</CardHeader>
							</Card>
							<Card>
								<CardHeader className="pb-2">
									<CardTitle className="text-2xl text-yellow-600">
										{featureStats.lowCoverageCount}
									</CardTitle>
									<CardDescription>Low Coverage</CardDescription>
								</CardHeader>
							</Card>
						</div>
					)}

					{/* Category Filter */}
					{categories && categories.length > 0 && (
						<div className="flex flex-wrap gap-2">
							<Button
								variant={selectedCategory === null ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedCategory(null)}
							>
								All Categories
							</Button>
							{categories.map((category: string) => (
								<Button
									key={category}
									variant={selectedCategory === category ? "default" : "outline"}
									size="sm"
									onClick={() => setSelectedCategory(category)}
								>
									{category}
									{featureStats?.categoryCounts[category] && (
										<span className="ml-1 text-xs opacity-70">
											({featureStats.categoryCounts[category]})
										</span>
									)}
								</Button>
							))}
						</div>
					)}

					{/* Feature Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList>
							<TabsTrigger value="all">
								All Features {features && `(${features.length})`}
							</TabsTrigger>
							<TabsTrigger value="uncovered">
								Uncovered {uncoveredFeatures && `(${uncoveredFeatures.length})`}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-4">
							{features && features.length > 0 ? (
								<div className="space-y-3">
									{features.map((feature) => renderFeatureCard(feature))}
								</div>
							) : latestAnalysis?.status === "completed" ? (
								<Card>
									<CardContent className="pt-6">
										<EmptyState
											title="No Features Found"
											description="No features match the current filters. Try selecting a different category or run a new analysis."
										/>
									</CardContent>
								</Card>
							) : (
								<Card>
									<CardContent className="pt-6">
										<EmptyState
											title="No Features Discovered"
											description="Click 'Analyze Codebase' to discover features in your project."
										/>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value="uncovered" className="mt-4">
							{uncoveredFeatures && uncoveredFeatures.length > 0 ? (
								<div className="space-y-3">
									{uncoveredFeatures.map((feature: Doc<"features"> & { testCount: number }) => (
										<div
											key={feature._id}
											className="flex items-center justify-between p-4 border rounded-lg bg-red-50"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">{feature.name}</span>
													{feature.category && (
														<Badge variant="neutral" className="text-xs">
															{feature.category}
														</Badge>
													)}
												</div>
												<p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="error">No Tests</Badge>
												<Link
													to={`/test-suggestions?feature=${feature._id}`}
													className="inline-flex items-center justify-center text-sm font-medium rounded-md px-3 h-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
												>
													Generate Test Suggestions
												</Link>
											</div>
										</div>
									))}
								</div>
							) : (
								<Card>
									<CardContent className="pt-6">
										<EmptyState
											title="All Features Covered"
											description="Great job! All discovered features have at least one test mapped to them."
										/>
									</CardContent>
								</Card>
							)}
						</TabsContent>
					</Tabs>
				</>
			)}
		</div>
	);
}
