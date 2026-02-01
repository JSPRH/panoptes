// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { CoverageTree } from "../components/CoverageTree";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import type { TreeNode } from "../lib/pathUtils";
import { ChartCard, CoverageTrendChart } from "../components/charts";
import { getPeriodStartTimestamp } from "../lib/chartUtils";

export default function CoverageTreePage() {
	const [useStatementCoverage, setUseStatementCoverage] = useState(false);
	const [historicalPeriod, setHistoricalPeriod] = useState<"1w" | "1m" | "1y" | undefined>(
		undefined
	);
	const [trendPeriod, setTrendPeriod] = useState("30d");
	const [showAllMetrics, setShowAllMetrics] = useState(false);

	const treeData = useQuery(api.tests.getCoverageTree, {
		useStatementCoverage,
		historicalPeriod,
	});

	// Get project ID from tree data if available (we'll need to get it another way)
	// For now, we'll get it from test runs
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 1 });
	const projectId = testRuns?.[0]?.projectId;

	// Get historical coverage data for trend chart
	const startTimestamp = getPeriodStartTimestamp(trendPeriod);
	const coverageHistory = useQuery(
		api.tests.getCoverageHistory,
		projectId && startTimestamp
			? {
					projectId: projectId as Id<"projects">,
					startTimestamp,
					limit: 100,
					useStatementCoverage,
				}
			: projectId
				? {
						projectId: projectId as Id<"projects">,
						limit: 100,
						useStatementCoverage,
					}
				: "skip"
	);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Coverage Tree"
				description={
					useStatementCoverage
						? "Statement coverage organized by packages and directories"
						: "Lines of Code coverage organized by packages and directories"
				}
			/>

			{coverageHistory && coverageHistory.length > 0 && (
				<ChartCard
					title="Coverage Trend Over Time"
					description={`${useStatementCoverage ? "Statement" : "Line"} coverage trends across test runs`}
					selectedPeriod={trendPeriod}
					onPeriodChange={setTrendPeriod}
				>
					<div className="mb-4 flex items-center gap-4">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={showAllMetrics}
								onChange={(e) => setShowAllMetrics(e.target.checked)}
								className="rounded border-border"
							/>
							<span className="text-muted-foreground">
								Show all metrics (Lines, Statements, Branches, Functions)
							</span>
						</label>
					</div>
					<CoverageTrendChart
						data={coverageHistory}
						showArea
						height={300}
						showAllMetrics={showAllMetrics}
					/>
				</ChartCard>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Source Code Coverage</CardTitle>
							<CardDescription>
								Hierarchical view of code coverage for source files (test files excluded)
							</CardDescription>
						</div>
						<div className="flex items-center gap-4">
							{/* Historical Comparison */}
							<div className="flex items-center gap-2">
								<label htmlFor="historical-period" className="text-sm font-medium">
									Compare:
								</label>
								<div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
									<Button
										variant={historicalPeriod === "1w" ? "default" : "ghost"}
										size="sm"
										onClick={() =>
											setHistoricalPeriod(historicalPeriod === "1w" ? undefined : "1w")
										}
										className="h-7 text-xs"
									>
										1w
									</Button>
									<Button
										variant={historicalPeriod === "1m" ? "default" : "ghost"}
										size="sm"
										onClick={() =>
											setHistoricalPeriod(historicalPeriod === "1m" ? undefined : "1m")
										}
										className="h-7 text-xs"
									>
										1m
									</Button>
									<Button
										variant={historicalPeriod === "1y" ? "default" : "ghost"}
										size="sm"
										onClick={() =>
											setHistoricalPeriod(historicalPeriod === "1y" ? undefined : "1y")
										}
										className="h-7 text-xs"
									>
										1y
									</Button>
								</div>
							</div>

							{/* Statement Coverage Switch */}
							<div className="flex items-center gap-3">
								<label htmlFor="statement-coverage" className="text-sm font-medium">
									Statement Coverage
								</label>
								<Switch
									id="statement-coverage"
									checked={useStatementCoverage}
									onCheckedChange={setUseStatementCoverage}
								/>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-6">
					{treeData && treeData.length > 0 ? (
						<div className="space-y-1">
							{treeData.map((node) => (
								<CoverageTree
									key={node.path}
									node={node as TreeNode}
									useStatementCoverage={useStatementCoverage}
								/>
							))}
						</div>
					) : (
						<EmptyState
							title="No coverage data available"
							description="Run your tests with coverage enabled to see code coverage organized by directory structure here."
							image="/panoptes_under_fruit_tree.png"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
