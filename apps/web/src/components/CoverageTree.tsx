import { useState } from "react";
import type { TreeNode } from "../lib/pathUtils";

interface CoverageTreeProps {
	node: TreeNode;
	level?: number;
}

export function CoverageTree({ node, level = 0 }: CoverageTreeProps) {
	const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

	const indent = level * 20;
	const isDirectory = node.type === "directory";
	const hasChildren = node.children && node.children.length > 0;

	const coverage = node.coverage ?? 0;
	const coverageColor = coverage >= 80 ? "bg-success" : coverage >= 50 ? "bg-warning" : "bg-error";

	return (
		<div>
			<div
				className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2 transition-colors"
				style={{ paddingLeft: `${indent}px` }}
			>
				{isDirectory && hasChildren ? (
					<button
						type="button"
						onClick={() => setIsExpanded(!isExpanded)}
						className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
					>
						{isExpanded ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								role="img"
								aria-label="Collapse"
							>
								<title>Collapse</title>
								<polyline points="6 9 12 15 18 9" />
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								role="img"
								aria-label="Expand"
							>
								<title>Expand</title>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						)}
					</button>
				) : (
					<div className="w-4" />
				)}

				<span className="font-medium text-sm flex-1 truncate">{node.name}</span>

				{node.linesTotal != null && node.linesTotal > 0 && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<span className="whitespace-nowrap">
							{node.linesCovered ?? 0}/{node.linesTotal} ({coverage.toFixed(1)}%)
						</span>
						<div className="w-16 bg-muted rounded-full h-1.5">
							<div
								className={`h-1.5 rounded-full ${coverageColor}`}
								style={{ width: `${Math.min(100, coverage)}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{isDirectory && hasChildren && isExpanded && node.children && (
				<div>
					{node.children.map((child) => (
						<CoverageTree key={child.path} node={child} level={level + 1} />
					))}
				</div>
			)}
		</div>
	);
}
