// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { useState } from "react";
import { CoverageTree } from "../components/CoverageTree";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import type { TreeNode } from "../lib/pathUtils";

export default function CoverageTreePage() {
	const [useStatementCoverage, setUseStatementCoverage] = useState(false);
	const [historicalPeriod, setHistoricalPeriod] = useState<"1w" | "1m" | "1y" | undefined>(
		undefined
	);

	const treeData = useQuery(api.tests.getCoverageTree, {
		useStatementCoverage,
		historicalPeriod,
	});

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
