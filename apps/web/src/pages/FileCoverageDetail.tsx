// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import TestSuggestions from "../components/TestSuggestions";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

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
	const generateTestSuggestions = useAction(api.testSuggestionsActions.generateTestSuggestions);
	const triggerCloudAgentForTestCoverage = useAction(
		api.testSuggestionsActions.triggerCloudAgentForTestCoverage
	);
	const projects = useQuery(api.tests.getProjects);

	const [fileLines, setFileLines] = useState<string[]>([]);
	const [loadingContent, setLoadingContent] = useState(false);
	const [contentError, setContentError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("coverage");
	const [showInfo, setShowInfo] = useState(false);
	const [coverageViewType, setCoverageViewType] = useState<"line" | "statement">("line");
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);
	const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
	const [isTriggeringAgent, setIsTriggeringAgent] = useState(false);
	const [agentError, setAgentError] = useState<string | null>(null);
	const [agentResult, setAgentResult] = useState<{ agentUrl?: string; prUrl?: string } | null>(
		null
	);

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
				statementDetails: fileCoverageData.statementDetails,
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

	const statementDetails = useMemo(() => {
		if (!fileCoverage?.statementDetails) return null;
		try {
			return JSON.parse(fileCoverage.statementDetails) as Array<{
				id: string;
				startLine: number;
				endLine: number;
				covered: boolean;
			}>;
		} catch {
			return null;
		}
	}, [fileCoverage?.statementDetails]);

	// Create a map of line numbers to statement coverage status
	const lineToStatementCoverage = useMemo(() => {
		if (!statementDetails) return null;
		const map = new Map<number, { covered: boolean; statementId: string }>();
		for (const stmt of statementDetails) {
			for (let line = stmt.startLine; line <= stmt.endLine; line++) {
				// If a line is part of multiple statements, mark as covered if any statement is covered
				const existing = map.get(line);
				if (!existing || !existing.covered) {
					map.set(line, { covered: stmt.covered, statementId: stmt.id });
				}
			}
		}
		return map;
	}, [statementDetails]);

	const coverage = useMemo(() => {
		if (!fileCoverage) return 0;
		if (
			coverageViewType === "statement" &&
			fileCoverage.statementsTotal != null &&
			fileCoverage.statementsTotal > 0
		) {
			return ((fileCoverage.statementsCovered ?? 0) / fileCoverage.statementsTotal) * 100;
		}
		return (fileCoverage.linesCovered / fileCoverage.linesTotal) * 100;
	}, [fileCoverage, coverageViewType]);

	const coverageLabel =
		coverageViewType === "statement" &&
		fileCoverage?.statementsTotal != null &&
		fileCoverage.statementsTotal > 0
			? "Statement Coverage"
			: "LOC Coverage";

	const coverageValue =
		coverageViewType === "statement" &&
		fileCoverage?.statementsTotal != null &&
		fileCoverage.statementsTotal > 0
			? `${fileCoverage.statementsCovered ?? 0}/${fileCoverage.statementsTotal}`
			: `${fileCoverage?.linesCovered ?? 0}/${fileCoverage?.linesTotal ?? 0}`;

	const cursorLink = useMemo(() => {
		if (!filePath) return null;
		const uncoveredLines = lineDetails?.uncovered || [];
		// Always generate link - if all lines covered, prompt to review/add more tests
		return generateCursorDeeplink(decodeURIComponent(filePath), uncoveredLines);
	}, [filePath, lineDetails]);

	// Get test suggestions (cached)
	const testSuggestions = useQuery(
		api.tests.getTestSuggestions,
		fileCoverage && filePath
			? {
					file: decodeURIComponent(filePath),
					projectId: fileCoverage.projectId,
					commitSha: fileCoverageData?.testRun?.commitSha,
				}
			: "skip"
	);

	// Generate suggestions when AI Suggestions tab is opened and no cache exists
	useEffect(() => {
		if (
			activeTab === "suggestions" &&
			!testSuggestions &&
			!loadingSuggestions &&
			fileCoverage &&
			filePath
		) {
			setLoadingSuggestions(true);
			setSuggestionsError(null);
			generateTestSuggestions({
				file: decodeURIComponent(filePath),
				projectId: fileCoverage.projectId,
				commitSha: fileCoverageData?.testRun?.commitSha,
			})
				.catch((error) => {
					setSuggestionsError(
						error instanceof Error ? error.message : "Failed to generate test suggestions"
					);
				})
				.finally(() => {
					setLoadingSuggestions(false);
				});
		}
	}, [
		activeTab,
		testSuggestions,
		loadingSuggestions,
		fileCoverage,
		filePath,
		fileCoverageData?.testRun?.commitSha,
		generateTestSuggestions,
	]);

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

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full max-w-lg grid-cols-3">
					<TabsTrigger value="coverage">Coverage</TabsTrigger>
					<TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
					<TabsTrigger value="about">About Coverage</TabsTrigger>
				</TabsList>

				<TabsContent value="coverage" className="space-y-8 mt-6">
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
									<div className="flex gap-2">
										{cursorLink && (
											<Button
												onClick={() => {
													window.location.href = cursorLink;
												}}
												variant="outline"
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
												💬 Open in Cursor
												{lineDetails && lineDetails.uncovered.length > 0 && (
													<span className="ml-2 text-xs opacity-80">
														({lineDetails.uncovered.length} uncovered)
													</span>
												)}
											</Button>
										)}
										{fileCoverage &&
											projects &&
											projects.find((p) => p._id === fileCoverage.projectId)?.repository && (
												<Button
													onClick={async () => {
														if (isTriggeringAgent || !fileCoverage) return;
														setIsTriggeringAgent(true);
														setAgentError(null);
														setAgentResult(null);
														try {
															const uncoveredLines = lineDetails?.uncovered || [];
															const result = await triggerCloudAgentForTestCoverage({
																file: decodedFilePath,
																projectId: fileCoverage.projectId,
																uncoveredLines,
																commitSha: fileCoverageData?.testRun?.commitSha,
															});
															setAgentResult(result);
															if (result.prUrl) {
																window.open(result.prUrl, "_blank");
															} else if (result.agentUrl) {
																window.open(result.agentUrl, "_blank");
															}
														} catch (e) {
															setAgentError(
																e instanceof Error ? e.message : "Failed to trigger cloud agent"
															);
														} finally {
															setIsTriggeringAgent(false);
														}
													}}
													disabled={isTriggeringAgent}
													variant="default"
													size="sm"
												>
													{isTriggeringAgent ? "Launching..." : "🚀 Launch Agent"}
												</Button>
											)}
									</div>
									{agentResult && (
										<div className="mt-2 p-2 bg-muted rounded text-sm">
											{agentResult.prUrl ? (
												<div>
													✅ Cloud agent launched!{" "}
													<a
														href={agentResult.prUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline"
													>
														View Pull Request →
													</a>
												</div>
											) : agentResult.agentUrl ? (
												<div>
													✅ Cloud agent launched!{" "}
													<a
														href={agentResult.agentUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline"
													>
														View Agent →
													</a>
												</div>
											) : (
												<div>✅ Cloud agent launched!</div>
											)}
										</div>
									)}
									{agentError && <div className="mt-2 text-sm text-destructive">{agentError}</div>}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div>
									<div className="text-sm text-muted-foreground flex items-center gap-1">
										{coverageLabel}
										{fileCoverage.statementsTotal != null && fileCoverage.statementsTotal > 0 && (
											<Button
												variant="ghost"
												size="icon"
												className="h-4 w-4"
												onClick={() => setShowInfo(!showInfo)}
												title="What is statement coverage?"
											>
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
													className="text-muted-foreground"
													aria-label="Info"
												>
													<title>Info icon</title>
													<circle cx="12" cy="12" r="10" />
													<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
													<line x1="12" y1="17" x2="12.01" y2="17" />
												</svg>
											</Button>
										)}
									</div>
									<div className="text-2xl font-bold">{coverageValue}</div>
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
					{(lineDetails || statementDetails) && (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>
											{coverageViewType === "line" ? "Line-by-line Coverage" : "Statement Coverage"}
										</CardTitle>
										<CardDescription>
											{coverageViewType === "line" ? (
												<>
													{lineDetails?.covered.length ?? 0} covered,{" "}
													{lineDetails?.uncovered.length ?? 0} uncovered
													{(lineDetails?.uncovered.length ?? 0) > 0 && " lines"}
												</>
											) : (
												<>
													{statementDetails?.filter((s) => s.covered).length ?? 0} covered,{" "}
													{statementDetails?.filter((s) => !s.covered).length ?? 0} uncovered
													{(statementDetails?.filter((s) => !s.covered).length ?? 0) > 0 &&
														" statements"}
												</>
											)}
										</CardDescription>
									</div>
									{statementDetails && (
										<div className="flex items-center gap-3">
											<label htmlFor="coverage-view-type" className="text-sm font-medium">
												View:
											</label>
											<div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
												<Button
													variant={coverageViewType === "line" ? "default" : "ghost"}
													size="sm"
													onClick={() => setCoverageViewType("line")}
													className="h-7"
												>
													Line
												</Button>
												<Button
													variant={coverageViewType === "statement" ? "default" : "ghost"}
													size="sm"
													onClick={() => setCoverageViewType("statement")}
													className="h-7"
												>
													Statement
												</Button>
											</div>
										</div>
									)}
								</div>
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
										<div className="text-sm text-muted-foreground">
											{coverageViewType === "statement"
												? "Uncovered statements:"
												: "Uncovered lines:"}
										</div>
										<div className="flex flex-wrap gap-2">
											{coverageViewType === "statement" && statementDetails
												? statementDetails
														.filter((s) => !s.covered)
														.map((stmt) => {
															const lines: number[] = [];
															for (let line = stmt.startLine; line <= stmt.endLine; line++) {
																lines.push(line);
															}
															return (
																<Badge
																	key={stmt.id}
																	variant="error"
																	className="font-mono cursor-pointer hover:bg-error/20"
																	onClick={() => {
																		const link = generateCursorDeeplink(decodedFilePath, lines);
																		window.location.href = link;
																	}}
																>
																	Statement {stmt.id} (lines {stmt.startLine}-{stmt.endLine})
																</Badge>
															);
														})
												: lineDetails?.uncovered.map((line) => (
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
												let isCovered = false;
												let isUncovered = false;

												if (coverageViewType === "statement" && lineToStatementCoverage) {
													const stmtInfo = lineToStatementCoverage.get(lineNum);
													if (stmtInfo) {
														isCovered = stmtInfo.covered;
														isUncovered = !stmtInfo.covered;
													}
												} else if (coverageViewType === "line" && lineDetails) {
													isCovered = lineDetails.covered.includes(lineNum);
													isUncovered = lineDetails.uncovered.includes(lineNum);
												}

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
														<div className="flex-1 break-all whitespace-pre-wrap">
															{line || " "}
														</div>
														{isUncovered && (
															<div className="text-error text-xs flex items-center flex-shrink-0">
																<Badge variant="error" className="text-xs">
																	{coverageViewType === "statement"
																		? "Uncovered Statement"
																		: "Uncovered"}
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
											File content not available.{" "}
											{coverageViewType === "statement"
												? "Uncovered statements:"
												: "Uncovered lines:"}
										</div>
										<div className="flex flex-wrap gap-2">
											{coverageViewType === "statement" && statementDetails
												? statementDetails
														.filter((s) => !s.covered)
														.map((stmt) => {
															const lines: number[] = [];
															for (let line = stmt.startLine; line <= stmt.endLine; line++) {
																lines.push(line);
															}
															return (
																<Badge
																	key={stmt.id}
																	variant="error"
																	className="font-mono cursor-pointer hover:bg-error/20"
																	onClick={() => {
																		const link = generateCursorDeeplink(decodedFilePath, lines);
																		window.location.href = link;
																	}}
																>
																	Statement {stmt.id} (lines {stmt.startLine}-{stmt.endLine})
																</Badge>
															);
														})
												: lineDetails?.uncovered.map((line) => (
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
												<div className="text-sm font-medium mb-2">
													💡 Add test coverage with Cursor
												</div>
												<div className="text-sm text-muted-foreground mb-3">
													Click "Open in Cursor" above to open this file with instructions to add
													test coverage for the uncovered lines.
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
				</TabsContent>

				<TabsContent value="suggestions" className="space-y-6 mt-6">
					<TestSuggestions
						suggestions={testSuggestions?.suggestions || []}
						loading={loadingSuggestions}
						error={suggestionsError}
					/>
				</TabsContent>

				<TabsContent value="about" className="space-y-6 mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Understanding Code Coverage</CardTitle>
							<CardDescription>Learn about different types of coverage metrics</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<h3 className="text-lg font-semibold mb-2">
									LOC Coverage (Lines of Code Coverage)
								</h3>
								<p className="text-muted-foreground mb-3">
									LOC Coverage measures which physical lines of code were executed during your
									tests. It's the simplest form of coverage and answers: "Did this line run at least
									once?"
								</p>
								<div className="bg-muted/50 p-4 rounded-lg border border-border">
									<p className="text-sm font-medium mb-2">Example:</p>
									<pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
										{`function calculate(a, b) {
  const sum = a + b;     // Line 2 - covered
  return sum;            // Line 3 - covered
}

// LOC Coverage: 2/2 = 100%`}
									</pre>
								</div>
							</div>

							<div>
								<h3 className="text-lg font-semibold mb-2">Statement Coverage</h3>
								<p className="text-muted-foreground mb-3">
									Statement Coverage measures which executable statements were executed. A statement
									is the smallest unit of executable code. This is more precise than LOC coverage
									because:
								</p>
								<ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">
									<li>Multiple statements can exist on one line</li>
									<li>One statement can span multiple lines</li>
									<li>It focuses on actual executable code, not formatting</li>
								</ul>
								<div className="bg-muted/50 p-4 rounded-lg border border-border">
									<p className="text-sm font-medium mb-2">Example:</p>
									<pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
										{`function calculate(a, b) {
  const sum = a + b; return sum;  // 2 statements on 1 line
}

// Statement Coverage: 2/2 = 100%
// LOC Coverage: 1/1 = 100%`}
									</pre>
								</div>
							</div>

							<div>
								<h3 className="text-lg font-semibold mb-2">Branch Coverage</h3>
								<p className="text-muted-foreground mb-3">
									Branch Coverage measures whether both the true and false branches of conditional
									statements (if/else, ternary operators, etc.) were executed. This is more rigorous
									than statement coverage because it ensures all decision paths are tested.
								</p>
								<div className="bg-muted/50 p-4 rounded-lg border border-border">
									<p className="text-sm font-medium mb-2">Example:</p>
									<pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
										{`function check(value) {
  if (value > 0) {      // Branch 1: true path
    return "positive";  // Covered
  } else {              // Branch 2: false path
    return "non-positive"; // Not covered
  }
}

// Statement Coverage: 3/4 = 75%
// Branch Coverage: 1/2 = 50%`}
									</pre>
								</div>
							</div>

							<div>
								<h3 className="text-lg font-semibold mb-2">Function Coverage</h3>
								<p className="text-muted-foreground mb-3">
									Function Coverage measures which functions were called at least once during
									testing. It helps identify completely untested functions.
								</p>
							</div>

							<div className="bg-warning-muted/20 border border-warning/30 p-4 rounded-lg">
								<p className="text-sm font-medium mb-2">⚠️ Important Limitations</p>
								<p className="text-sm text-muted-foreground">
									Even 100% coverage doesn't guarantee your code is bug-free. Coverage only tells
									you that code was executed, not that it was tested correctly. Always combine
									coverage metrics with good test practices like testing edge cases, error
									conditions, and expected behavior.
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
