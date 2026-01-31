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

export default function TestExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
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
	const projects = useQuery(api.tests.getProjects);
	const [attachmentsWithUrls, setAttachmentsWithUrls] = useState<
		Array<{ _id: Id<"testAttachments">; name: string; contentType: string; url: string | null }>
	>([]);

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

	const handleTriggerCloudAgent = (test: Test) => {
		const project = getProjectForTest(test);
		if (!project?.repository) {
			alert("Project repository not configured. Cannot trigger cloud agent.");
			return;
		}

		// For now, show instructions. In the future, this could call an API
		const prompt = `Investigate and fix the failing test "${test.name}" in file ${test.file}${test.line ? ` at line ${test.line}` : ""}. Error: ${test.error || "Test failed"}.`;
		const instructions = `To trigger a Cursor Cloud Agent for this test:

1. Go to your repository: ${project.repository}
2. Use the GitHub Action workflow (if configured) or
3. Use Cursor CLI: agent -p "${prompt}"

Alternatively, add the cursor-cloud-agent.yml workflow to your repository.`;
		alert(instructions);
	};

	// Tests are already filtered server-side, so use them directly
	const filteredTests = tests || [];

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
	}, [searchQuery, statusFilter]);

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
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<input
							type="text"
							placeholder="Search tests..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="flex-1 px-4 py-2 border rounded-md"
						/>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-4 py-2 border rounded-md"
						>
							<option value="all">All Status</option>
							<option value="passed">Passed</option>
							<option value="failed">Failed</option>
							<option value="skipped">Skipped</option>
						</select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Tests</CardTitle>
					<CardDescription>
						{status === "CanLoadMore" || status === "LoadingMore" || status === "LoadingFirstPage"
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
					</CardDescription>
				</CardHeader>
				<CardContent>
					{paginatedTests && paginatedTests.length > 0 ? (
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
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => handleTriggerCloudAgent(test)}
																	className="text-xs"
																>
																	Trigger Cloud Agent
																</Button>
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
