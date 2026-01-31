// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

function getCoverageVariant(coverage: number): "success" | "warning" | "error" | "neutral" {
	if (coverage >= 80) return "success";
	if (coverage >= 50) return "warning";
	return "error";
}

function generateCursorDeeplink(file: string, uncoveredLines: number[]): string {
	// Cursor deeplink format: cursor://file?path=<file>&line=<line>
	// We'll create a link that opens the file and includes instructions
	const firstUncoveredLine = uncoveredLines.length > 0 ? uncoveredLines[0] : 1;
	const instructions = encodeURIComponent(
		`Add test coverage for ${file}. Uncovered lines: ${uncoveredLines.slice(0, 10).join(", ")}${uncoveredLines.length > 10 ? ` and ${uncoveredLines.length - 10} more` : ""}`
	);
	return `cursor://file?path=${encodeURIComponent(file)}&line=${firstUncoveredLine}&instructions=${instructions}`;
}

export default function FileCoverageDetail() {
	const { file: filePath } = useParams<{ file: string }>();
	const fileCoverage = useQuery(
		api.tests.getFileCoverage,
		filePath ? { file: decodeURIComponent(filePath) } : "skip"
	);

	const [fileContent] = useState<string | null>(null);

	const lineDetails = useMemo(() => {
		if (!fileCoverage?.lineDetails) return null;
		try {
			return JSON.parse(fileCoverage.lineDetails) as {
				covered: number[];
				uncovered: number[];
			};
		} catch {
			return null;
		}
	}, [fileCoverage?.lineDetails]);

	const coverage = fileCoverage ? (fileCoverage.linesCovered / fileCoverage.linesTotal) * 100 : 0;

	const cursorLink = useMemo(() => {
		if (!filePath || !lineDetails?.uncovered.length) return null;
		return generateCursorDeeplink(decodeURIComponent(filePath), lineDetails.uncovered);
	}, [filePath, lineDetails]);

	// File content would ideally come from a Convex function or GitHub API
	// For now, we show uncovered lines as badges

	if (!filePath) {
		return (
			<div className="space-y-8">
				<PageHeader title="File Coverage" description="View coverage details for a file" />
				<EmptyState
					title="No file specified"
					description="Please select a file from the coverage tree to view its details."
				/>
			</div>
		);
	}

	const decodedFilePath = decodeURIComponent(filePath);

	if (fileCoverage === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="File Coverage" description="Loading coverage details..." />
				<Card>
					<CardContent className="p-6">
						<div className="text-center text-muted-foreground">Loading...</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (fileCoverage === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="File Coverage" description="No coverage data found" />
				<EmptyState
					title="No coverage data available"
					description={`No coverage data found for ${decodedFilePath}. Run your tests with coverage enabled.`}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader title="File Coverage" description={`Coverage details for ${decodedFilePath}`} />

			{/* Summary Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="font-mono text-sm text-muted-foreground mb-2">
								{decodedFilePath}
							</CardTitle>
							<CardDescription>Coverage statistics</CardDescription>
						</div>
						<div className="flex items-center gap-4">
							<Badge variant={getCoverageVariant(coverage)} className="text-lg px-4 py-2">
								{coverage.toFixed(1)}%
							</Badge>
							{cursorLink && (
								<Button
									onClick={() => {
										window.location.href = cursorLink;
									}}
									variant="default"
									size="sm"
								>
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
										className="mr-2"
										aria-hidden="true"
									>
										<title>Cursor</title>
										<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
										<polyline points="10 17 15 12 10 7" />
										<line x1="15" y1="12" x2="3" y2="12" />
									</svg>
									Open in Cursor
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div className="text-sm text-muted-foreground">Lines Covered</div>
							<div className="text-2xl font-bold">
								{fileCoverage.linesCovered}/{fileCoverage.linesTotal}
							</div>
						</div>
						{fileCoverage.statementsTotal != null && (
							<div>
								<div className="text-sm text-muted-foreground">Statements</div>
								<div className="text-2xl font-bold">
									{fileCoverage.statementsCovered ?? 0}/{fileCoverage.statementsTotal}
								</div>
							</div>
						)}
						{fileCoverage.branchesTotal != null && (
							<div>
								<div className="text-sm text-muted-foreground">Branches</div>
								<div className="text-2xl font-bold">
									{fileCoverage.branchesCovered ?? 0}/{fileCoverage.branchesTotal}
								</div>
							</div>
						)}
						{fileCoverage.functionsTotal != null && (
							<div>
								<div className="text-sm text-muted-foreground">Functions</div>
								<div className="text-2xl font-bold">
									{fileCoverage.functionsCovered ?? 0}/{fileCoverage.functionsTotal}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Line-by-line Coverage */}
			{lineDetails && (
				<Card>
					<CardHeader>
						<CardTitle>Line-by-line Coverage</CardTitle>
						<CardDescription>
							{lineDetails.covered.length} covered, {lineDetails.uncovered.length} uncovered
							{lineDetails.uncovered.length > 0 && " lines"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{fileContent ? (
							<div className="font-mono text-sm">
								{fileContent.split("\n").map((line, index) => {
									const lineNum = index + 1;
									const isCovered = lineDetails.covered.includes(lineNum);
									const isUncovered = lineDetails.uncovered.includes(lineNum);
									return (
										<div
											key={lineNum}
											className={`flex gap-4 py-0.5 px-2 ${
												isUncovered
													? "bg-error-muted/30 border-l-2 border-error"
													: isCovered
														? "bg-success-muted/20"
														: ""
											}`}
										>
											<div className="text-muted-foreground w-12 text-right flex-shrink-0">
												{lineNum}
											</div>
											<div className="flex-1">{line || " "}</div>
											{isUncovered && (
												<div className="text-error text-xs flex items-center">Uncovered</div>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<div className="space-y-2">
								<div className="text-sm text-muted-foreground mb-4">
									File content not available. Uncovered lines:
								</div>
								<div className="flex flex-wrap gap-2">
									{lineDetails.uncovered.map((line) => (
										<Badge
											key={line}
											variant="error"
											className="font-mono cursor-pointer hover:bg-error/20"
											onClick={() => {
												if (cursorLink) {
													const link = generateCursorDeeplink(decodedFilePath, [line]);
													window.location.href = link;
												}
											}}
										>
											Line {line}
										</Badge>
									))}
								</div>
								{cursorLink && (
									<div className="mt-4 p-4 bg-muted rounded-lg">
										<div className="text-sm font-medium mb-2">💡 Add test coverage with Cursor</div>
										<div className="text-sm text-muted-foreground mb-3">
											Click "Open in Cursor" above to open this file with instructions to add test
											coverage for the uncovered lines.
										</div>
										<Button
											onClick={() => {
												window.location.href = cursorLink;
											}}
											variant="outline"
											size="sm"
										>
											Open in Cursor with Instructions
										</Button>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
