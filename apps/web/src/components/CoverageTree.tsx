import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TreeNode } from "../lib/pathUtils";
import { Badge } from "./ui/badge";

interface CoverageTreeProps {
	node: TreeNode;
	level?: number;
	useStatementCoverage?: boolean;
}

function getCoverageVariant(coverage: number): "success" | "warning" | "error" | "neutral" {
	if (coverage >= 80) return "success";
	if (coverage >= 50) return "warning";
	return "error";
}

function getCoverageColorClass(coverage: number): string {
	if (coverage >= 80) return "bg-success";
	if (coverage >= 50) return "bg-warning";
	return "bg-error";
}

export function CoverageTree({ node, level = 0, useStatementCoverage = false }: CoverageTreeProps) {
	const navigate = useNavigate();
	const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

	const indent = level * 24;
	const isDirectory = node.type === "directory";
	const hasChildren = node.children && node.children.length > 0;
	const coverage = node.coverage ?? 0;
	const hasCoverage = useStatementCoverage
		? node.statementsTotal != null && node.statementsTotal > 0
		: node.linesTotal != null && node.linesTotal > 0;
	const coverageValue = useStatementCoverage
		? `${node.statementsCovered ?? 0}/${node.statementsTotal ?? 0}`
		: `${node.linesCovered ?? 0}/${node.linesTotal ?? 0}`;
	const historicalCoverage = node.historicalCoverage;

	const handleFileClick = (e: React.MouseEvent) => {
		if (!isDirectory && node.path) {
			e.stopPropagation();
			navigate(`/coverage/${encodeURIComponent(node.path)}`);
		}
	};

	return (
		<div className="group">
			<div
				className="flex items-center gap-3 py-2 px-3 hover:bg-muted/60 rounded-lg transition-all duration-200 border border-transparent hover:border-border/50"
				style={{ paddingLeft: `${indent + 8}px` }}
			>
				{/* Expand/Collapse Button */}
				{isDirectory && hasChildren ? (
					<button
						type="button"
						onClick={() => setIsExpanded(!isExpanded)}
						className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-background rounded flex-shrink-0"
						aria-label={isExpanded ? "Collapse" : "Expand"}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
							aria-hidden="true"
						>
							<title>{isExpanded ? "Collapse" : "Expand"}</title>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				) : (
					<div className="w-5 flex-shrink-0 flex items-center justify-center">
						{!isDirectory && (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-muted-foreground/60"
								aria-hidden="true"
							>
								<title>File</title>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
								<line x1="16" y1="13" x2="8" y2="13" />
								<line x1="16" y1="17" x2="8" y2="17" />
								<polyline points="10 9 9 9 8 9" />
							</svg>
						)}
					</div>
				)}

				{/* Directory Icon */}
				{isDirectory && (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-muted-foreground/70 flex-shrink-0"
						aria-hidden="true"
					>
						<title>Directory</title>
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
					</svg>
				)}

				{/* Name */}
				{isDirectory ? (
					<span className="flex-1 truncate text-sm font-semibold text-foreground">{node.name}</span>
				) : (
					<button
						type="button"
						onClick={handleFileClick}
						className="flex-1 truncate text-sm font-medium text-foreground/90 cursor-pointer hover:text-primary transition-colors text-left"
						title={`Click to view coverage details for ${node.name}`}
					>
						{node.name}
					</button>
				)}

				{/* Coverage Info */}
				{hasCoverage && (
					<div className="flex items-center gap-3 flex-shrink-0">
						{/* Historical Change Indicator */}
						{historicalCoverage && (
							<div
								className={`text-xs font-medium px-2 py-0.5 rounded ${
									historicalCoverage.change > 0
										? "bg-success-muted/30 text-success"
										: historicalCoverage.change < 0
											? "bg-error-muted/30 text-error"
											: "bg-muted text-muted-foreground"
								}`}
								title={`${historicalCoverage.change > 0 ? "+" : ""}${historicalCoverage.change.toFixed(1)}% vs historical`}
							>
								{historicalCoverage.change > 0 ? "↑" : historicalCoverage.change < 0 ? "↓" : "→"}{" "}
								{Math.abs(historicalCoverage.change).toFixed(1)}%
							</div>
						)}

						{/* Coverage Badge */}
						<Badge
							variant={getCoverageVariant(coverage)}
							className="font-mono text-xs px-2 py-0.5 min-w-[4rem] justify-center"
						>
							{coverage.toFixed(1)}%
						</Badge>

						{/* Coverage Stats */}
						<div className="flex items-center gap-2 text-xs text-muted-foreground min-w-[5rem] justify-end">
							<span className="font-mono">{coverageValue}</span>
						</div>

						{/* Progress Bar */}
						<div className="w-20 bg-muted rounded-full h-2 overflow-hidden flex-shrink-0">
							<div
								className={`h-full rounded-full transition-all duration-500 ease-out ${getCoverageColorClass(
									coverage
								)}`}
								style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Children */}
			{isDirectory && hasChildren && isExpanded && node.children && (
				<div className="ml-2 border-l border-border/30 pl-1">
					{node.children.map((child) => (
						<CoverageTree
							key={child.path}
							node={child}
							level={level + 1}
							useStatementCoverage={useStatementCoverage}
						/>
					))}
				</div>
			)}
		</div>
	);
}
