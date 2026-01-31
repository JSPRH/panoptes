// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
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
	// Cursor deeplink format: cursor://anysphere.cursor-deeplink/prompt?text=...
	// See: https://cursor.com/docs/integrations/deeplinks
	const uncoveredLinesList =
		uncoveredLines.length > 0
			? uncoveredLines.slice(0, 20).join(", ") +
				(uncoveredLines.length > 20 ? ` and ${uncoveredLines.length - 20} more` : "")
			: "all lines";

	const prompt = `Add test coverage for ${file}. 

The following lines are currently uncovered: ${uncoveredLinesList}

Please:
1. Open the file: ${file}
2. Review the uncovered lines
3. Add appropriate test cases to cover these lines
4. Ensure the tests follow the existing test patterns in the codebase

Focus on covering the uncovered lines listed above.`;

	const encodedPrompt = encodeURIComponent(prompt);
	return `cursor://anysphere.cursor-deeplink/prompt?text=${encodedPrompt}`;
}

export default function FileCoverageDetail() {
	const { file: filePath } = useParams<{ file: string }>();
	const fileCoverageData = useQuery(
		api.tests.getFileCoverage,
		filePath ? { file: decodeURIComponent(filePath) } : "skip"
	);
	const getFileContent = useAction(api.github.getFileContent);

	const [fileLines, setFileLines] = useState<string[]>([]);
	const [loadingContent, setLoadingContent] = useState(false);
	const [contentError, setContentError] = useState<string | null>(null);

	const fileCoverage = fileCoverageData
		? {
				...fileCoverageData,
				projectId: fileCoverageData.projectId,
				testRunId: fileCoverageData.testRunId,
				file: fileCoverageData.file,
				linesCovered: fileCoverageData.linesCovered,
				linesTotal: fileCoverageData.linesTotal,
				lineDetails: fileCoverageData.lineDetails,
				statementsCovered: fileCoverageData.statementsCovered,
				statementsTotal: fileCoverageData.statementsTotal,
				branchesCovered: fileCoverageData.branchesCovered,
				branchesTotal: fileCoverageData.branchesTotal,
				functionsCovered: fileCoverageData.functionsCovered,
				functionsTotal: fileCoverageData.functionsTotal,
			}
		: null;

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
		if (!filePath) return null;
		const uncoveredLines = lineDetails?.uncovered || [];
		// Always generate link - if all lines covered, prompt to review/add more tests
		return generateCursorDeeplink(decodeURIComponent(filePath), uncoveredLines);
	}, [filePath, lineDetails]);

	// Fetch file content from GitHub
	useEffect(() => {
		if (!fileCoverageData?.projectId || !filePath) return;

		const fetchContent = async () => {
			setLoadingContent(true);
			setContentError(null);
			try {
				const commitSha = fileCoverageData.testRun?.commitSha;
				const result = await getFileContent({
					projectId: fileCoverageData.projectId,
					file: decodeURIComponent(filePath),
					ref: commitSha,
				});
				setFileLines(result.lines);
			} catch (error) {
				setContentError(
					error instanceof Error ? error.message : "Failed to fetch file content from GitHub"
				);
			} finally {
				setLoadingContent(false);
			}
		};

		fetchContent();
	}, [fileCoverageData?.projectId, fileCoverageData?.testRun?.commitSha, filePath, getFileContent]);

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
									{lineDetails && lineDetails.uncovered.length > 0 && (
										<span className="ml-2 text-xs opacity-80">
											({lineDetails.uncovered.length} uncovered)
										</span>
									)}
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
						{loadingContent ? (
							<div className="text-center text-muted-foreground py-8">
								Loading file content from GitHub...
							</div>
						) : contentError ? (
							<div className="space-y-4">
								<div className="text-sm text-error bg-error-muted/20 p-4 rounded-lg">
									{contentError}
								</div>
								<div className="text-sm text-muted-foreground">Uncovered lines:</div>
								<div className="flex flex-wrap gap-2">
									{lineDetails?.uncovered.map((line) => (
										<Badge
											key={line}
											variant="error"
											className="font-mono cursor-pointer hover:bg-error/20"
											onClick={() => {
												const link = generateCursorDeeplink(decodedFilePath, [line]);
												window.location.href = link;
											}}
										>
											Line {line}
										</Badge>
									))}
								</div>
							</div>
						) : fileLines.length > 0 ? (
							<div className="font-mono text-sm bg-muted/30 rounded-lg overflow-hidden border border-border">
								<div className="max-h-[600px] overflow-y-auto">
									{fileLines.map((line, index) => {
										const lineNum = index + 1;
										const isCovered = lineDetails?.covered.includes(lineNum) ?? false;
										const isUncovered = lineDetails?.uncovered.includes(lineNum) ?? false;
										return (
											<div
												key={lineNum}
												className={`flex gap-4 py-1 px-3 hover:bg-muted/50 transition-colors ${
													isUncovered
														? "bg-error-muted/40 border-l-3 border-error"
														: isCovered
															? "bg-success-muted/20 border-l-3 border-success/50"
															: ""
												}`}
											>
												<div className="text-muted-foreground w-12 text-right flex-shrink-0 select-none">
													{lineNum}
												</div>
												<div className="flex-1 break-all whitespace-pre-wrap">{line || " "}</div>
												{isUncovered && (
													<div className="text-error text-xs flex items-center flex-shrink-0">
														<Badge variant="error" className="text-xs">
															Uncovered
														</Badge>
													</div>
												)}
											</div>
										);
									})}
								</div>
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
												const link = generateCursorDeeplink(decodedFilePath, [line]);
												window.location.href = link;
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
