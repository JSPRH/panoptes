// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { CoverageTree } from "../components/CoverageTree";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import type { TreeNode } from "../lib/pathUtils";

export default function CoverageTreePage() {
	const treeData = useQuery(api.tests.getCoverageTree, {});

	return (
		<div className="space-y-8">
			<PageHeader
				title="Coverage Tree"
				description="Lines of Code coverage organized by packages and directories"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Source Code Coverage</CardTitle>
					<CardDescription>
						Hierarchical view of code coverage for source files (test files excluded)
					</CardDescription>
				</CardHeader>
				<CardContent>
					{treeData && treeData.length > 0 ? (
						<div className="space-y-1">
							{treeData.map((node) => (
								<CoverageTree key={node.path} node={node as TreeNode} />
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
