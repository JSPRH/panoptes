// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CodeSnippet from "../components/CodeSnippet";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
type TestExecution = Doc<"tests">;

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function formatDuration(ms: number | undefined): string {
	if (ms == null) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusVariant(status: string): "success" | "error" | "info" | "neutral" {
	if (status === "passed") return "success";
	if (status === "failed") return "error";
	if (status === "running") return "info";
	return "neutral";
}

export default function TestExecutionDetail() {
	const { executionId } = useParams<{ executionId: string }>();
	const execution = useQuery(
		api.tests.getTestExecution,
		executionId ? { testId: executionId as Id<"tests"> } : "skip"
	);
	const testRun = useQuery(
		api.tests.getTestRun,
		execution?.testRunId ? { runId: execution.testRunId } : "skip"
	);
	const project = useQuery(api.tests.getProjects, execution?.projectId ? {} : "skip")?.find(
		(p) => p._id === execution?.projectId
	);
	const codeSnippet = useQuery(
		api.github.getCodeSnippetForTest,
		executionId ? { testId: executionId as Id<"tests"> } : "skip"
	);
	const getTestAttachmentsWithUrls = useAction(api.tests.getTestAttachmentsWithUrls);
	const [attachmentsWithUrls, setAttachmentsWithUrls] = useState<
		Array<{ _id: Id<"testAttachments">; name: string; contentType: string; url: string | null }>
	>([]);

	// AI Analysis
	const analysis = useQuery(
		api.testFailureAnalysis.getTestFailureAnalysis,
		executionId ? { testId: executionId as Id<"tests"> } : "skip"
	);
	const analyzeTestFailure = useAction(api.testFailureAnalysisActions.analyzeTestFailure);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisError, setAnalysisError] = useState<string | null>(null);

	useEffect(() => {
		if (!executionId) {
			setAttachmentsWithUrls([]);
			return;
		}
		getTestAttachmentsWithUrls({ testId: executionId as Id<"tests"> })
			.then(setAttachmentsWithUrls)
			.catch(() => setAttachmentsWithUrls([]));
	}, [executionId, getTestAttachmentsWithUrls]);

	if (executionId === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Execution" description="View a single test execution" />
				<EmptyState
					title="No execution selected"
					description="Use a valid execution link from Test Runs or Test Explorer."
					action={<Link to="/runs">Back to Test Runs</Link>}
				/>
			</div>
		);
	}

	if (execution === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Execution" description="View a single test execution" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (execution === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Execution" description="View a single test execution" />
				<EmptyState
					title="Execution not found"
					description="This test execution does not exist or was removed."
					action={<Link to="/runs">Back to Test Runs</Link>}
				/>
			</div>
		);
	}

	const selectedExecution = execution as TestExecution;
	const testDefinitionPath = `/tests/${encodeURIComponent(selectedExecution.projectId)}/${encodeURIComponent(selectedExecution.name)}/${encodeURIComponent(selectedExecution.file)}${selectedExecution.line ? `?line=${selectedExecution.line}` : ""}`;

	return (
		<div className="space-y-8">
			<PageHeader title="Test Execution" description="Execution details" />
			<p className="text-sm text-muted-foreground">
				<Link to="/runs" className="text-primary hover:underline">
					Test Runs
				</Link>
				{testRun && (
					<>
						{" → "}
						<Link to={`/runs/${testRun._id}`} className="text-primary hover:underline">
							Run Details
						</Link>
					</>
				)}
				{" → Execution Details"}
			</p>

			<Card>
				<CardHeader>
					<CardTitle>Execution Summary</CardTitle>
					<CardDescription>
						{selectedExecution.name} • {selectedExecution.file}
						{selectedExecution.line != null && `:${selectedExecution.line}`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getStatusVariant(selectedExecution.status)}>
							{selectedExecution.status}
						</Badge>
						<span className="text-sm text-muted-foreground">
							{formatDuration(selectedExecution.duration)}
						</span>
						{selectedExecution.suite && (
							<Badge variant="neutral">Suite: {selectedExecution.suite}</Badge>
						)}
						{selectedExecution.tags && selectedExecution.tags.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{selectedExecution.tags.map((tag) => (
									<Badge key={tag} variant="neutral">
										{tag}
									</Badge>
								))}
							</div>
						)}
						{selectedExecution.retries != null && selectedExecution.retries > 0 && (
							<Badge variant="neutral">{selectedExecution.retries} retries</Badge>
						)}
					</div>
				</CardContent>
			</Card>

			{testRun && (
				<Card>
					<CardHeader>
						<CardTitle>Test Run</CardTitle>
						<CardDescription>
							{formatTime(testRun.startedAt)} • {testRun.framework} • {testRun.testType}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-center gap-2">
							<Link
								to={`/runs/${testRun._id}`}
								className="text-primary hover:underline font-medium"
							>
								View Run Details →
							</Link>
							<Badge variant={getStatusVariant(testRun.status)}>{testRun.status}</Badge>
							<Badge variant="neutral">{testRun.framework}</Badge>
							<Badge variant="neutral">{testRun.testType}</Badge>
							{testRun.ci != null && (
								<Badge variant={testRun.ci ? "info" : "neutral"}>
									{testRun.ci ? "CI" : "Local"}
								</Badge>
							)}
							<span className="text-sm text-muted-foreground">
								{testRun.passedTests}/{testRun.totalTests} passed
							</span>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Test Definition</CardTitle>
					<CardDescription>View all executions of this test across different runs</CardDescription>
				</CardHeader>
				<CardContent>
					<Link to={testDefinitionPath} className="text-primary hover:underline font-medium">
						View All Executions →
					</Link>
				</CardContent>
			</Card>

			{selectedExecution.error && (
				<>
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-destructive">Error</CardTitle>
								{selectedExecution.status === "failed" && (
									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											if (!executionId) return;
											setIsAnalyzing(true);
											setAnalysisError(null);
											try {
												await analyzeTestFailure({ testId: executionId as Id<"tests"> });
											} catch (e) {
												setAnalysisError(e instanceof Error ? e.message : "Failed to analyze");
											} finally {
												setIsAnalyzing(false);
											}
										}}
										disabled={isAnalyzing || analysis?.status === "pending"}
									>
										{isAnalyzing || analysis?.status === "pending"
											? "Analyzing..."
											: analysis?.status === "completed"
												? "Re-analyze with AI"
												: "Explain with AI"}
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
									{selectedExecution.error}
								</pre>
								{selectedExecution.errorDetails && (
									<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
										{selectedExecution.errorDetails}
									</pre>
								)}
							</div>
						</CardContent>
					</Card>

					{analysisError && (
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-destructive">{analysisError}</p>
							</CardContent>
						</Card>
					)}

					{analysis && analysis.status === "completed" && (
						<Card>
							<CardHeader>
								<CardTitle>AI Analysis</CardTitle>
								<CardDescription>
									Confidence:{" "}
									<Badge
										variant={
											analysis.confidence === "high"
												? "success"
												: analysis.confidence === "medium"
													? "info"
													: "neutral"
										}
									>
										{analysis.confidence}
									</Badge>
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{analysis.summary && (
									<div>
										<h4 className="text-sm font-semibold mb-2">Summary</h4>
										<p className="text-sm text-muted-foreground">{analysis.summary}</p>
									</div>
								)}

								{analysis.rootCause && (
									<div>
										<h4 className="text-sm font-semibold mb-2">Root Cause</h4>
										<p className="text-sm text-muted-foreground">{analysis.rootCause}</p>
									</div>
								)}

								{analysis.suggestedFix && (
									<div>
										<h4 className="text-sm font-semibold mb-2">Suggested Fix</h4>
										<pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
											{analysis.suggestedFix}
										</pre>
									</div>
								)}

								{analysis.codeLocation && (
									<div>
										<h4 className="text-sm font-semibold mb-2">Code Location</h4>
										<p className="text-sm text-muted-foreground font-mono">
											{analysis.codeLocation}
										</p>
									</div>
								)}

								{analysis.relatedFiles && analysis.relatedFiles.length > 0 && (
									<div>
										<h4 className="text-sm font-semibold mb-2">Related Files</h4>
										<ul className="list-disc list-inside space-y-1">
											{analysis.relatedFiles.map((file: string) => (
												<li key={file} className="text-sm text-muted-foreground font-mono">
													{file}
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="flex gap-2 pt-2 border-t">
									{project?.repository && selectedExecution.file && selectedExecution.line && (
										<>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													// Deep link to Cursor
													const cursorUrl = `cursor://file?file=${encodeURIComponent(
														selectedExecution.file
													)}&line=${selectedExecution.line}`;
													window.open(cursorUrl, "_blank");
												}}
											>
												Open in Cursor
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													// Create a GitHub link to the file
													const repoInfo = project.repository?.match(
														/(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\/]+?)(?:\.git)?/
													);
													if (repoInfo) {
														const [, owner, repo] = repoInfo;
														const ref = testRun?.commitSha || "main";
														const githubUrl = `https://github.com/${owner}/${repo}/blob/${ref}/${selectedExecution.file}#L${selectedExecution.line}`;
														window.open(githubUrl, "_blank");
													}
												}}
											>
												View on GitHub
											</Button>
										</>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{selectedExecution.stdout && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Stdout</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
							{selectedExecution.stdout}
						</pre>
					</CardContent>
				</Card>
			)}

			{selectedExecution.stderr && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-destructive">Stderr</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
							{selectedExecution.stderr}
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
					targetLine={selectedExecution.line || undefined}
					file={selectedExecution.file}
					repository={project.repository}
					commitSha={testRun?.commitSha}
					showGitHubLink={testRun?.ci === true}
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

			{selectedExecution.metadata && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Metadata</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
							{JSON.stringify(selectedExecution.metadata, null, 2)}
						</pre>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
