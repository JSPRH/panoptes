// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CodeSnippet from "../components/CodeSnippet";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getGitHubBlobUrl } from "../lib/utils";

type Test = Doc<"tests"> & { ci?: boolean; commitSha?: string };
type Project = Doc<"projects">;

const ITEMS_PER_PAGE = 20;
const PAGINATION_PAGE_SIZE = 100; // Load 100 tests per page from Convex

type ViewMode = "individual" | "byFile";

function getFrameworkColor(framework: string): string {
	switch (framework) {
		case "vitest":
			return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
		case "playwright":
			return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
		case "jest":
			return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
		default:
			return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
	}
}

function getTestTypeColor(testType: string): string {
	switch (testType) {
		case "unit":
			return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
		case "integration":
			return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
		case "e2e":
			return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
		case "visual":
			return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20";
		default:
			return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
	}
}

export default function TestExplorer() {
	const [viewMode, setViewMode] = useState<ViewMode>("individual");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [testTypeFilter, setTestTypeFilter] = useState<string>("all");
	const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [expandedTestId, setExpandedTestId] = useState<Id<"tests"> | null>(null);

	const {
		results: tests,
		status,
		loadMore,
	} = usePaginatedQuery(
		api.tests.getTestsPaginated,
		{
			status:
				statusFilter === "all"
					? undefined
					: (statusFilter as "passed" | "failed" | "skipped" | "running" | undefined),
			searchQuery: searchQuery.trim() || undefined,
		},
		{ initialNumItems: PAGINATION_PAGE_SIZE }
	);
	const seedFailingTest = useMutation(api.tests.seedFailingTest);
	const getCodeSnippet = useAction(api.github.getCodeSnippet);
	const storeCodeSnippet = useMutation(api.github.storeCodeSnippet);
	const getTestAttachmentsWithUrls = useAction(api.tests.getTestAttachmentsWithUrls);
	const triggerCloudAgentForTest = useAction(
		api.testFailureAnalysisActions.triggerCloudAgentForTest
	);
	const projects = useQuery(api.tests.getProjects);
	const [attachmentsWithUrls, setAttachmentsWithUrls] = useState<
		Array<{ _id: Id<"testAttachments">; name: string; contentType: string; url: string | null }>
	>([]);
	const [triggeringAgentForTest, setTriggeringAgentForTest] = useState<Id<"tests"> | null>(null);
	const [selectedActionType, setSelectedActionType] = useState<
		Record<Id<"tests">, "fix_test" | "fix_bug">
	>({} as Record<Id<"tests">, "fix_test" | "fix_bug">);

	// Query for test files view
	const testFileGroups = useQuery(api.tests.getTestsByTestFile, {});

	// Get project for the test to find repository
	const getProjectForTest = (test: Test): Project | undefined => {
		return projects?.find((p) => p._id === test.projectId);
	};

	// Query for the expanded test's code snippet
	const expandedCodeSnippet = useQuery(
		api.github.getCodeSnippetForTest,
		expandedTestId ? { testId: expandedTestId as Id<"tests"> } : "skip"
	);

	// Fetch attachments with URLs when a test is expanded
	useEffect(() => {
		if (!expandedTestId) {
			setAttachmentsWithUrls([]);
			return;
		}
		getTestAttachmentsWithUrls({ testId: expandedTestId })
			.then(setAttachmentsWithUrls)
			.catch(() => setAttachmentsWithUrls([]));
	}, [expandedTestId, getTestAttachmentsWithUrls]);

	const handleViewCode = (test: Test) => {
		if (expandedTestId === test._id) {
			setExpandedTestId(null);
			return;
		}
		setExpandedTestId(test._id as Id<"tests">);
	};

	const handleTriggerCloudAgent = async (test: Test) => {
		const project = getProjectForTest(test);
		if (!project?.repository) {
			alert("Project repository not configured. Cannot trigger cloud agent.");
			return;
		}

		if (triggeringAgentForTest === test._id) return;

		setTriggeringAgentForTest(test._id);
		const actionType = selectedActionType[test._id] || "fix_bug";

		try {
			const result = await triggerCloudAgentForTest({
				testId: test._id,
				actionType,
			});

			if (result.prUrl) {
				window.open(result.prUrl, "_blank");
			} else if (result.agentUrl) {
				window.open(result.agentUrl, "_blank");
			}
		} catch (error) {
			alert(
				`Failed to trigger cloud agent: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			setTriggeringAgentForTest(null);
		}
	};

	// Tests are already filtered server-side, so use them directly
	const filteredTests = tests || [];

	// Filter test file groups
	const filteredGroups = useMemo(() => {
		if (!testFileGroups) return [];
		return testFileGroups.filter((group) => {
			const matchesSearch =
				!searchQuery ||
				group.testFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
				group.tests.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesTestType = testTypeFilter === "all" || group.testType === testTypeFilter;
			const matchesFramework = frameworkFilter === "all" || group.framework === frameworkFilter;
			return matchesSearch && matchesTestType && matchesFramework;
		});
	}, [testFileGroups, searchQuery, testTypeFilter, frameworkFilter]);

	const uniqueTestTypes = useMemo(() => {
		if (!testFileGroups) return [];
		return Array.from(new Set(testFileGroups.map((g) => g.testType))).sort();
	}, [testFileGroups]);

	const uniqueFrameworks = useMemo(() => {
		if (!testFileGroups) return [];
		return Array.from(new Set(testFileGroups.map((g) => g.framework))).sort();
	}, [testFileGroups]);

	// Build test definition key for feature lookup when a test is expanded
	const expandedTestDefinitionKey = useMemo(() => {
		if (!expandedTestId) return null;
		const test = filteredTests.find((t) => t._id === expandedTestId);
		if (!test) return null;
		return `${test.projectId}|${test.name}|${test.file}|${test.line ?? ""}`;
	}, [expandedTestId, filteredTests]);

	// Get feature mappings for the expanded test
	// biome-ignore lint/suspicious/noExplicitAny: API types not generated yet for new tables
	const featuresApi = (api as any).features;
	const expandedTestFeatures = useQuery(
		featuresApi?.getTestFeatureMappings,
		expandedTestDefinitionKey ? { testDefinitionKey: expandedTestDefinitionKey } : "skip"
	) as
		| Array<{
				_id: Id<"testFeatureMappings">;
				featureId: Id<"features">;
				confidence: number;
				feature: { name: string; category?: string } | null;
		  }>
		| undefined;

	const totalPages = Math.ceil((filteredTests?.length || 0) / ITEMS_PER_PAGE);
	const paginatedTests = useMemo(() => {
		if (!filteredTests) return [];
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		return filteredTests.slice(startIndex, endIndex);
	}, [filteredTests, currentPage]);

	// Reset to page 1 when filters change or when current page is out of bounds
	useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(1);
		}
	}, [totalPages, currentPage]);

	// Reset to page 1 when search or filter changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to reset page when these change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter, testTypeFilter, frameworkFilter, viewMode]);

	// Fetch code snippet from GitHub when expanded test has no snippet in DB
	useEffect(() => {
		if (!expandedTestId || expandedCodeSnippet !== null || !projects || !filteredTests.length)
			return;
		const test = filteredTests.find((t) => t._id === expandedTestId);
		if (!test?.line) return;
		const project = projects.find((p) => p._id === test.projectId);
		if (!project?.repository) return;
		getCodeSnippet({
			projectId: project._id,
			file: test.file,
			line: test.line,
			contextLines: 10,
		})
			.then((snippet) =>
				storeCodeSnippet({
					testId: test._id,
					file: test.file,
					startLine: snippet.startLine,
					endLine: snippet.endLine,
					content: snippet.content,
					language: snippet.language,
				})
			)
			.catch((err) => console.error("Failed to fetch code snippet:", err));
	}, [
		expandedTestId,
		expandedCodeSnippet,
		filteredTests,
		projects,
		getCodeSnippet,
		storeCodeSnippet,
	]);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<PageHeader title="Test Explorer" description="Browse and search your tests" />
				<Button
					onClick={async () => {
						try {
							console.log("Seeding test...");
							const result = await seedFailingTest();
							console.log("Seed result:", result);
							alert("Sample failing test seeded successfully!");
						} catch (error) {
							console.error("Failed to seed test - Error object:", error);
							console.error(
								"Error message:",
								error instanceof Error ? error.message : String(error)
							);
							console.error(
								"Error stack:",
								error instanceof Error ? error.stack : "No stack trace"
							);
							console.error(
								"Full error details:",
								JSON.stringify(error, Object.getOwnPropertyNames(error))
							);
							alert(
								`Failed to seed test: ${error instanceof Error ? error.message : String(error)}. Check console for details.`
							);
						}
					}}
					variant="outline"
					size="sm"
				>
					Seed Sample Test
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>View Mode</CardTitle>
						<div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
							<Button
								variant={viewMode === "individual" ? "default" : "ghost"}
								size="sm"
								onClick={() => setViewMode("individual")}
								className="h-7 text-xs"
							>
								Individual Tests
							</Button>
							<Button
								variant={viewMode === "byFile" ? "default" : "ghost"}
								size="sm"
								onClick={() => setViewMode("byFile")}
								className="h-7 text-xs"
							>
								By Test File
							</Button>
						</div>
					</div>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<input
								type="text"
								placeholder={
									viewMode === "byFile" ? "Search by test file or test name..." : "Search tests..."
								}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-4 py-2 border rounded-md"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{viewMode === "individual" && (
								<div>
									<label htmlFor="status" className="block text-sm font-medium mb-2">
										Status
									</label>
									<select
										id="status"
										value={statusFilter}
										onChange={(e) => setStatusFilter(e.target.value)}
										className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
									>
										<option value="all">All Status</option>
										<option value="passed">Passed</option>
										<option value="failed">Failed</option>
										<option value="skipped">Skipped</option>
									</select>
								</div>
							)}
							{viewMode === "byFile" && (
								<>
									<div>
										<label htmlFor="testType" className="block text-sm font-medium mb-2">
											Test Type
										</label>
										<select
											id="testType"
											value={testTypeFilter}
											onChange={(e) => setTestTypeFilter(e.target.value)}
											className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
										>
											<option value="all">All Types</option>
											{uniqueTestTypes.map((type) => (
												<option key={type} value={type}>
													{type.charAt(0).toUpperCase() + type.slice(1)}
												</option>
											))}
										</select>
									</div>
									<div>
										<label htmlFor="framework" className="block text-sm font-medium mb-2">
											Framework
										</label>
										<select
											id="framework"
											value={frameworkFilter}
											onChange={(e) => setFrameworkFilter(e.target.value)}
											className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
										>
											<option value="all">All Frameworks</option>
											{uniqueFrameworks.map((framework) => (
												<option key={framework} value={framework}>
													{framework.charAt(0).toUpperCase() + framework.slice(1)}
												</option>
											))}
										</select>
									</div>
								</>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{viewMode === "byFile" ? "Test Files" : "Tests"}</CardTitle>
					<CardDescription>
						{viewMode === "byFile" ? (
							<>
								{filteredGroups.length} test file group{filteredGroups.length !== 1 ? "s" : ""}{" "}
								found
							</>
						) : (
							<>
								{status === "CanLoadMore" ||
								status === "LoadingMore" ||
								status === "LoadingFirstPage"
									? `Loading tests... (${filteredTests.length} loaded so far)`
									: `${filteredTests.length} test${filteredTests.length !== 1 ? "s" : ""} found`}
								{filteredTests && filteredTests.length > ITEMS_PER_PAGE && (
									<>
										{" "}
										(showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
										{Math.min(currentPage * ITEMS_PER_PAGE, filteredTests.length)} of{" "}
										{filteredTests.length})
									</>
								)}
							</>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{viewMode === "byFile" ? (
						<>
							{filteredGroups.length > 0 ? (
								<div className="space-y-4">
									{filteredGroups.map((group) => (
										<div
											key={`${group.testFile}-${group.testType}-${group.framework}`}
											className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
										>
											<div className="flex items-start justify-between mb-3">
												<div className="flex-1">
													<div className="font-medium text-lg mb-2">{group.testFile}</div>
													<div className="flex flex-wrap gap-2">
														<Badge className={getTestTypeColor(group.testType)}>
															{group.testType}
														</Badge>
														<Badge className={getFrameworkColor(group.framework)}>
															{group.framework}
														</Badge>
													</div>
												</div>
												<div className="text-sm text-muted-foreground">
													<div>
														<span className="text-success">{group.passed} passed</span>
														{group.failed > 0 && (
															<>
																{" · "}
																<span className="text-error">{group.failed} failed</span>
															</>
														)}
														{group.skipped > 0 && (
															<>
																{" · "}
																<span className="text-muted-foreground">
																	{group.skipped} skipped
																</span>
															</>
														)}
													</div>
													<div className="mt-1">
														{group.tests.length} test{group.tests.length !== 1 ? "s" : ""}
													</div>
												</div>
											</div>
											<div className="space-y-1 mt-3">
												{group.tests.slice(0, 10).map((test) => (
													<Link
														key={test._id}
														to={`/tests/${test.projectId}/${encodeURIComponent(test.name)}/${encodeURIComponent(test.file)}`}
														className="block py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
													>
														<div className="flex items-center justify-between">
															<span className="text-sm">{test.name}</span>
															<Badge
																variant={
																	test.status === "passed"
																		? "success"
																		: test.status === "failed"
																			? "error"
																			: "neutral"
																}
															>
																{test.status}
															</Badge>
														</div>
													</Link>
												))}
												{group.tests.length > 10 && (
													<div className="text-xs text-muted-foreground pt-2">
														+{group.tests.length - 10} more test
														{group.tests.length - 10 !== 1 ? "s" : ""}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							) : testFileGroups && testFileGroups.length === 0 ? (
								<EmptyState
									title="No test files found"
									description="Run your tests with a Panoptes reporter to see tests organized by test file here."
									image="/panoptes_under_fruit_tree.png"
								/>
							) : (
								<EmptyState
									title="No matching test files"
									description="Try adjusting your filters to see more results."
									image="/panoptes_under_fruit_tree.png"
								/>
							)}
						</>
					) : paginatedTests && paginatedTests.length > 0 ? (
						<>
							<div className="space-y-2">
								{paginatedTests.map((test: Test) => {
									const project = getProjectForTest(test);
									const showCodeSnippet = expandedTestId === test._id;
									const codeSnippet = showCodeSnippet ? expandedCodeSnippet : null;

									const testDefinitionPath = `/tests/${encodeURIComponent(test.projectId)}/${encodeURIComponent(test.name)}/${encodeURIComponent(test.file)}${test.line ? `?line=${test.line}` : ""}`;
									return (
										<div key={test._id}>
											<div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<Link
															to={`/executions/${test._id}`}
															className="font-medium hover:text-primary hover:underline"
														>
															{test.name}
														</Link>
														<Link
															to={testDefinitionPath}
															className="text-xs text-muted-foreground hover:text-primary hover:underline"
															onClick={(e) => e.stopPropagation()}
														>
															(View all executions)
														</Link>
													</div>
													<div className="text-sm text-muted-foreground">
														{test.file}
														{test.line && `:${test.line}`}
													</div>
													{test.suite && (
														<div className="text-xs text-muted-foreground mt-1">
															Suite: {test.suite}
														</div>
													)}
													{(() => {
														const githubUrl =
															project?.repository &&
															test.ci === true &&
															getGitHubBlobUrl(project.repository, test.file, {
																line: test.line ?? undefined,
																ref: test.commitSha,
															});
														return githubUrl ? (
															<a
																href={githubUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="text-xs text-primary hover:underline mt-1"
															>
																View in GitHub
															</a>
														) : null;
													})()}
												</div>
												<div className="flex items-center gap-2">
													<div className="text-sm text-muted-foreground">
														{typeof test.duration === "number"
															? test.duration.toFixed(2)
															: test.duration}
														ms
													</div>
													<Link to={`/executions/${test._id}`}>
														<Badge
															variant={
																test.status === "passed"
																	? "success"
																	: test.status === "failed"
																		? "error"
																		: "neutral"
															}
															className="cursor-pointer hover:opacity-80"
														>
															{test.status}
														</Badge>
													</Link>
													{test.line && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleViewCode(test)}
															className="text-xs"
														>
															{showCodeSnippet ? "Hide Details" : "View Details"}
														</Button>
													)}
													{test.status === "failed" && (
														<>
															<a
																href={`cursor://anysphere.cursor-deeplink/prompt?file=${encodeURIComponent(test.file)}&text=${encodeURIComponent(
																	`Investigate and fix the failing test "${test.name}" in file ${test.file}${test.line ? ` at line ${test.line}` : ""}. Error: ${test.error || "Test failed"}.`
																)}`}
																className="text-xs text-primary hover:underline"
															>
																Debug in Cursor
															</a>
															{project?.repository && (
																<div className="flex gap-1 items-center">
																	<select
																		value={selectedActionType[test._id] || "fix_bug"}
																		onChange={(e) =>
																			setSelectedActionType({
																				...selectedActionType,
																				[test._id]: e.target.value as "fix_test" | "fix_bug",
																			})
																		}
																		className="px-2 py-1 text-xs border rounded bg-background"
																		disabled={triggeringAgentForTest === test._id}
																		onKeyDown={(e) => {
																			if (e.key === "Enter" || e.key === " ") {
																				e.stopPropagation();
																			}
																		}}
																	>
																		<option value="fix_bug">Fix Bug</option>
																		<option value="fix_test">Fix Test</option>
																	</select>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => handleTriggerCloudAgent(test)}
																		disabled={triggeringAgentForTest === test._id}
																		className="text-xs"
																	>
																		{triggeringAgentForTest === test._id
																			? "Launching..."
																			: "🚀 Agent"}
																	</Button>
																</div>
															)}
														</>
													)}
												</div>
											</div>
											{showCodeSnippet && (
												<div className="mt-2 ml-4 space-y-4">
													{test.stdout && (
														<Card>
															<CardHeader>
																<CardTitle className="text-sm">Stdout</CardTitle>
															</CardHeader>
															<CardContent>
																<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
																	{test.stdout}
																</pre>
															</CardContent>
														</Card>
													)}
													{test.stderr && (
														<Card>
															<CardHeader>
																<CardTitle className="text-sm text-destructive">Stderr</CardTitle>
															</CardHeader>
															<CardContent>
																<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
																	{test.stderr}
																</pre>
															</CardContent>
														</Card>
													)}
													{codeSnippet && project && (
														<CodeSnippet
															content={codeSnippet.content}
															language={codeSnippet.language}
															startLine={codeSnippet.startLine}
															endLine={codeSnippet.endLine}
															targetLine={test.line || undefined}
															file={test.file}
															repository={project.repository}
															commitSha={test.commitSha}
															showGitHubLink={test.ci === true}
														/>
													)}
													{codeSnippet && !project && (
														<CodeSnippet
															content={codeSnippet.content}
															language={codeSnippet.language}
															startLine={codeSnippet.startLine}
															endLine={codeSnippet.endLine}
															targetLine={test.line || undefined}
															file={test.file}
															showGitHubLink={false}
														/>
													)}
													{/* Feature Tags */}
													{expandedTestFeatures && expandedTestFeatures.length > 0 && (
														<Card>
															<CardHeader>
																<CardTitle className="text-sm">Features Covered</CardTitle>
															</CardHeader>
															<CardContent>
																<div className="flex flex-wrap gap-2">
																	{expandedTestFeatures.map((mapping) =>
																		mapping.feature ? (
																			<Link
																				key={mapping._id}
																				to={`/features?feature=${mapping.featureId}`}
																				className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors"
																			>
																				<span>{mapping.feature.name}</span>
																				{mapping.feature.category && (
																					<span className="text-xs opacity-70">
																						({mapping.feature.category})
																					</span>
																				)}
																				<span className="text-xs opacity-50">
																					{Math.round(mapping.confidence * 100)}%
																				</span>
																			</Link>
																		) : null
																	)}
																</div>
															</CardContent>
														</Card>
													)}
													{attachmentsWithUrls.length > 0 && (
														<Card>
															<CardHeader>
																<CardTitle className="text-sm">Attachments</CardTitle>
															</CardHeader>
															<CardContent>
																<div className="flex flex-wrap gap-2">
																	{attachmentsWithUrls.map((att) =>
																		att.url && att.contentType.startsWith("image/") ? (
																			<a
																				key={att._id}
																				href={att.url}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="block"
																			>
																				<img
																					src={att.url}
																					alt={att.name}
																					className="max-w-xs max-h-48 rounded border object-contain"
																				/>
																			</a>
																		) : (
																			att.url && (
																				<a
																					key={att._id}
																					href={att.url}
																					target="_blank"
																					rel="noopener noreferrer"
																					className="text-sm text-primary hover:underline"
																				>
																					{att.name}
																				</a>
																			)
																		)
																	)}
																</div>
															</CardContent>
														</Card>
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>
							<div className="flex flex-col gap-4 mt-6 pt-4 border-t">
								{totalPages > 1 && (
									<div className="flex items-center justify-between">
										<div className="text-sm text-muted-foreground">
											Page {currentPage} of {totalPages}
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
												disabled={currentPage === 1}
											>
												Previous
											</Button>
											<div className="flex items-center gap-1">
												{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
													let pageNum: number;
													if (totalPages <= 5) {
														pageNum = i + 1;
													} else if (currentPage <= 3) {
														pageNum = i + 1;
													} else if (currentPage >= totalPages - 2) {
														pageNum = totalPages - 4 + i;
													} else {
														pageNum = currentPage - 2 + i;
													}
													return (
														<Button
															key={pageNum}
															variant={currentPage === pageNum ? "default" : "outline"}
															size="sm"
															onClick={() => setCurrentPage(pageNum)}
															className="min-w-[2.5rem]"
														>
															{pageNum}
														</Button>
													);
												})}
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
												disabled={currentPage === totalPages}
											>
												Next
											</Button>
										</div>
									</div>
								)}
								{status === "CanLoadMore" && (
									<div className="flex justify-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() => loadMore(PAGINATION_PAGE_SIZE)}
											disabled={false}
										>
											Load More Tests
										</Button>
									</div>
								)}
								{(status === "LoadingMore" || status === "LoadingFirstPage") && (
									<div className="flex justify-center">
										<Button variant="outline" size="sm" disabled={true}>
											Loading...
										</Button>
									</div>
								)}
							</div>
						</>
					) : (
						<EmptyState
							title="No tests found"
							description="Run your tests with a Panoptes reporter to see results here, or adjust your search and filters."
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
