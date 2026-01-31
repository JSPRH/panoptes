// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CodeSnippet from "../components/CodeSnippet";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type CIRun = Doc<"ciRuns">;
type CIRunAnalysis = Doc<"ciRunAnalysis">;

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

function formatDuration(startedAt: number, completedAt: number | undefined): string {
	if (!completedAt) return "—";
	const duration = Math.round((completedAt - startedAt) / 1000);
	if (duration < 60) return `${duration}s`;
	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;
	return `${minutes}m ${seconds}s`;
}

function getStatusVariant(
	status: string,
	conclusion?: string
): "success" | "error" | "info" | "neutral" {
	if (conclusion === "success") return "success";
	if (conclusion === "failure") return "error";
	if (status === "in_progress" || status === "queued") return "info";
	return "neutral";
}

function getStatusLabel(status: string, conclusion?: string) {
	if (conclusion) return conclusion;
	return status;
}

function CIRunJobs({ ciRunId }: { ciRunId: Id<"ciRuns"> }) {
	const jobs = useQuery(api.github.getCIRunJobs, { ciRunId });
	const [expandedJobs, setExpandedJobs] = useState<Set<Id<"ciRunJobs">>>(new Set());
	const [expandedSteps, setExpandedSteps] = useState<Set<Id<"ciRunJobSteps">>>(new Set());

	if (jobs === undefined) {
		return <p className="text-sm text-muted-foreground">Loading jobs...</p>;
	}

	if (jobs.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No jobs found. Click "Fetch Jobs & Logs" to retrieve job information from GitHub.
			</p>
		);
	}

	const toggleJob = (jobId: Id<"ciRunJobs">) => {
		const newExpanded = new Set(expandedJobs);
		if (newExpanded.has(jobId)) {
			newExpanded.delete(jobId);
		} else {
			newExpanded.add(jobId);
		}
		setExpandedJobs(newExpanded);
	};

	return (
		<div className="space-y-4">
			{jobs.map((job: Doc<"ciRunJobs">) => (
				<Card key={job._id}>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-base">{job.name}</CardTitle>
								<CardDescription>
									{formatTime(job.startedAt)}
									{job.completedAt && ` • ${formatDuration(job.startedAt, job.completedAt)}`}
									{job.runnerName && ` • ${job.runnerName}`}
								</CardDescription>
							</div>
							<Badge variant={getStatusVariant(job.status, job.conclusion || undefined)}>
								{getStatusLabel(job.status, job.conclusion || undefined)}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => toggleJob(job._id)}
							className="w-full justify-start"
						>
							{expandedJobs.has(job._id) ? "▼" : "▶"} Steps
						</Button>
						{expandedJobs.has(job._id) && (
							<CIRunJobSteps
								jobId={job._id}
								expandedSteps={expandedSteps}
								setExpandedSteps={setExpandedSteps}
							/>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function CIRunJobSteps({
	jobId,
	expandedSteps,
	setExpandedSteps,
}: {
	jobId: Id<"ciRunJobs">;
	expandedSteps: Set<Id<"ciRunJobSteps">>;
	setExpandedSteps: React.Dispatch<React.SetStateAction<Set<Id<"ciRunJobSteps">>>>;
}) {
	const steps = useQuery(api.github.getCIRunJobSteps, { jobId });

	if (steps === undefined) {
		return <p className="text-sm text-muted-foreground mt-2">Loading steps...</p>;
	}

	if (steps.length === 0) {
		return <p className="text-sm text-muted-foreground mt-2">No steps found.</p>;
	}

	const toggleStep = (stepId: Id<"ciRunJobSteps">) => {
		const newExpanded = new Set(expandedSteps);
		if (newExpanded.has(stepId)) {
			newExpanded.delete(stepId);
		} else {
			newExpanded.add(stepId);
		}
		setExpandedSteps(newExpanded);
	};

	return (
		<div className="mt-4 space-y-2">
			{steps.map((step: Doc<"ciRunJobSteps">) => (
				<CIRunJobStep
					key={step._id}
					step={step}
					isExpanded={expandedSteps.has(step._id)}
					onToggle={() => toggleStep(step._id)}
				/>
			))}
		</div>
	);
}

function CIRunJobStep({
	step,
	isExpanded,
	onToggle,
}: {
	step: Doc<"ciRunJobSteps">;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const parsedTests = useQuery(api.github.getCIRunParsedTestsByStep, { stepId: step._id });

	return (
		<div className="border rounded-md p-3">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{step.name}</span>
					<Badge
						variant={getStatusVariant(step.status, step.conclusion || undefined)}
						className="text-xs"
					>
						{getStatusLabel(step.status, step.conclusion || undefined)}
					</Badge>
					{parsedTests && parsedTests.length > 0 && (
						<Badge variant="neutral" className="text-xs">
							{parsedTests.filter((t: Doc<"ciRunParsedTests">) => t.status === "failed").length}{" "}
							failed,{" "}
							{parsedTests.filter((t: Doc<"ciRunParsedTests">) => t.status === "passed").length}{" "}
							passed
						</Badge>
					)}
				</div>
				{step.logs && (
					<Button variant="ghost" size="sm" onClick={onToggle}>
						{isExpanded ? "Hide" : "Show"} Logs
					</Button>
				)}
			</div>
			{isExpanded && (
				<div className="mt-2 space-y-3">
					{parsedTests && parsedTests.length > 0 && (
						<div className="space-y-2">
							<div className="text-sm font-medium">Parsed Tests:</div>
							{parsedTests.map((test: Doc<"ciRunParsedTests">) => (
								<div
									key={test._id}
									className={`border rounded p-2 ${
										test.status === "failed" ? "border-destructive bg-destructive/5" : ""
									}`}
								>
									<div className="flex items-center gap-2 mb-1">
										<Badge
											variant={
												test.status === "failed"
													? "error"
													: test.status === "passed"
														? "success"
														: "neutral"
											}
											className="text-xs"
										>
											{test.status}
										</Badge>
										<span className="text-sm font-medium">{test.testName}</span>
										{test.file && (
											<span className="text-xs text-muted-foreground">
												{test.file}
												{test.line ? `:${test.line}` : ""}
											</span>
										)}
										{test.duration && (
											<span className="text-xs text-muted-foreground">
												({Math.round(test.duration)}ms)
											</span>
										)}
									</div>
									{test.error && (
										<pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
											{test.error}
										</pre>
									)}
									{test.stdout && (
										<details className="mt-1">
											<summary className="text-xs text-muted-foreground cursor-pointer">
												Show stdout
											</summary>
											<pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
												{test.stdout}
											</pre>
										</details>
									)}
								</div>
							))}
						</div>
					)}
					{step.logs && (
						<div>
							<div className="text-sm font-medium mb-1">Raw Logs:</div>
							<CodeSnippet
								content={step.logs}
								language="text"
								startLine={1}
								endLine={step.logs.split("\n").length}
								showGitHubLink={false}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function CIRunAnalysis({ ciRunId, conclusion }: { ciRunId: Id<"ciRuns">; conclusion?: string }) {
	const analysis = useQuery(api.ciAnalysis.getCIRunAnalysis, { ciRunId });
	const analyzeFailure = useAction(api.ciAnalysisActions.analyzeCIRunFailure);
	const triggerCloudAgent = useAction(api.ciAnalysisActions.triggerCursorCloudAgent);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isTriggeringAgent, setIsTriggeringAgent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agentResult, setAgentResult] = useState<{ agentUrl?: string; prUrl?: string } | null>(
		null
	);

	const handleAnalyze = async () => {
		if (isAnalyzing) return;
		setIsAnalyzing(true);
		setError(null);
		try {
			await analyzeFailure({ ciRunId });
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to analyze");
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleOpenCursorDeeplink = () => {
		if (analysis?.analysis?.cursorDeeplink) {
			window.location.href = analysis.analysis.cursorDeeplink;
		}
	};

	const handleTriggerCloudAgent = async () => {
		if (isTriggeringAgent) return;
		setIsTriggeringAgent(true);
		setError(null);
		setAgentResult(null);
		try {
			const result = await triggerCloudAgent({ ciRunId });
			setAgentResult(result);
			if (result.prUrl) {
				// Open PR in new tab
				window.open(result.prUrl, "_blank");
			} else if (result.agentUrl) {
				// Open agent page in new tab
				window.open(result.agentUrl, "_blank");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to trigger cloud agent");
		} finally {
			setIsTriggeringAgent(false);
		}
	};

	if (conclusion !== "failure") {
		return null;
	}

	if (analysis === undefined) {
		return <p className="text-sm text-muted-foreground">Loading analysis...</p>;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>AI Failure Analysis</CardTitle>
					<div className="flex items-center gap-2">
						{analysis?.analysis?.cursorDeeplink && (
							<Button onClick={handleOpenCursorDeeplink} size="sm" variant="outline">
								💬 Open in Cursor
							</Button>
						)}
						{analysis?.analysis?.cursorBackgroundAgentData && (
							<Button
								onClick={handleTriggerCloudAgent}
								disabled={isTriggeringAgent}
								size="sm"
								variant="default"
							>
								{isTriggeringAgent ? "Launching..." : "🚀 Launch Cloud Agent"}
							</Button>
						)}
						{(!analysis || analysis?.status === "failed") && (
							<Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
								{isAnalyzing
									? "Analyzing..."
									: analysis?.status === "failed"
										? "Retry Analysis"
										: "Analyze Failure"}
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{error && <div className="text-sm text-destructive mb-4">{error}</div>}
				{analysis?.status === "pending" && (
					<p className="text-sm text-muted-foreground">Analysis in progress...</p>
				)}
				{analysis?.status === "failed" && (
					<div className="space-y-2">
						<p className="text-sm text-destructive">Analysis failed. Please try again.</p>
						<Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm" variant="outline">
							{isAnalyzing ? "Retrying..." : "Retry Analysis"}
						</Button>
					</div>
				)}
				{analysis?.status === "completed" && analysis.analysis && (
					<div className="space-y-4">
						<div>
							<div className="text-sm font-medium mb-1">Summary</div>
							<div className="text-sm text-muted-foreground">{analysis.analysis.summary}</div>
						</div>
						<div>
							<div className="text-sm font-medium mb-1">Root Cause</div>
							<div className="text-sm text-muted-foreground">{analysis.analysis.rootCause}</div>
						</div>
						<div>
							<div className="text-sm font-medium mb-1">Proposed Fix</div>
							<div className="text-sm text-muted-foreground whitespace-pre-wrap">
								{analysis.analysis.proposedFix}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium mb-1">Proposed Test</div>
							<div className="text-sm text-muted-foreground whitespace-pre-wrap">
								{analysis.analysis.proposedTest}
							</div>
						</div>
						{(analysis.analysis.cursorDeeplink || analysis.analysis.cursorBackgroundAgentData) && (
							<div>
								<div className="text-sm font-medium mb-2">Cursor Integration</div>
								<div className="space-y-2 text-sm text-muted-foreground">
									{analysis.analysis.cursorDeeplink && (
										<div>
											<strong>Open in Cursor:</strong> Click "Open in Cursor" above to open this
											prompt in Cursor for manual review and editing.
										</div>
									)}
									{analysis.analysis.cursorBackgroundAgentData && (
										<div>
											<strong>Launch Cloud Agent:</strong> Click "Launch Cloud Agent" above to
											automatically create a pull request with fixes. The agent will work in the
											background.
										</div>
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
								{analysis.analysis.cursorPrompt && (
									<details className="mt-2">
										<summary className="text-xs text-muted-foreground cursor-pointer">
											Show agent prompt
										</summary>
										<pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
											{analysis.analysis.cursorPrompt}
										</pre>
									</details>
								)}
							</div>
						)}
						<div className="flex items-center gap-2">
							<Badge variant={analysis.analysis.isFlaky ? "info" : "neutral"}>
								{analysis.analysis.isFlaky ? "Likely Flaky" : "Not Flaky"}
							</Badge>
							<span className="text-xs text-muted-foreground">
								Confidence: {Math.round(analysis.analysis.confidence * 100)}%
							</span>
							<span className="text-xs text-muted-foreground">Model: {analysis.model}</span>
						</div>
					</div>
				)}
				{!analysis && (
					<p className="text-sm text-muted-foreground">
						Click "Analyze Failure" to get AI-powered insights into what went wrong.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export default function CIRunDetail() {
	const { runId } = useParams<{ runId: string }>();
	const navigate = useNavigate();
	const run = useQuery(api.github.getCIRun, runId ? { runId: runId as Id<"ciRuns"> } : "skip");
	const testRuns = useQuery(
		api.tests.getTestRunsByCIRunId,
		runId ? { ciRunId: runId as Id<"ciRuns"> } : "skip"
	);
	const fetchJobs = useAction(api.github.fetchCIRunJobs);
	const [isFetchingJobs, setIsFetchingJobs] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	// Redirect to first test run if available
	useEffect(() => {
		if (testRuns && testRuns.length > 0) {
			navigate(`/runs/${testRuns[0]._id}`, { replace: true });
		}
	}, [testRuns, navigate]);

	if (runId === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<EmptyState
					title="No run selected"
					description="Use a valid run link from CI Runs."
					action={<Link to="/ci-runs">Back to CI Runs</Link>}
				/>
			</div>
		);
	}

	if (run === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (run === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<EmptyState
					title="Run not found"
					description="This CI run does not exist or was removed."
					action={<Link to="/ci-runs">Back to CI Runs</Link>}
				/>
			</div>
		);
	}

	// Show loading while checking for test runs
	if (testRuns === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="View a single CI run" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	const selectedRun = run as CIRun;

	const handleFetchJobs = async () => {
		if (!runId || isFetchingJobs) return;
		setIsFetchingJobs(true);
		setFetchError(null);
		try {
			await fetchJobs({ ciRunId: runId as Id<"ciRuns"> });
		} catch (e) {
			setFetchError(e instanceof Error ? e.message : "Failed to fetch jobs");
		} finally {
			setIsFetchingJobs(false);
		}
	};

	// If test runs exist, we'll redirect, but show a message in case redirect fails
	if (testRuns && testRuns.length > 0) {
		return (
			<div className="space-y-8">
				<PageHeader title="CI Run" description="Redirecting to test run..." />
				<p className="text-muted-foreground">Redirecting to test run...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader title="CI Run" description="Run details" />
			<p className="text-sm text-muted-foreground">
				<Link to="/ci-runs" className="text-primary hover:underline">
					CI Runs
				</Link>
				{" → Run details"}
			</p>
			{testRuns && testRuns.length === 0 && (
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="text-sm text-muted-foreground">
						No test runs are linked to this CI run. Test runs will appear here once tests are
						executed with the Panoptes reporter.
					</p>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Run Summary</CardTitle>
					<CardDescription>
						{formatTime(selectedRun.startedAt)} • {selectedRun.workflowName}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant={getStatusVariant(selectedRun.status, selectedRun.conclusion || undefined)}
						>
							{getStatusLabel(selectedRun.status, selectedRun.conclusion || undefined)}
						</Badge>
						<span className="text-sm text-muted-foreground">Branch: {selectedRun.branch}</span>
						<span className="text-sm text-muted-foreground">
							Commit: {selectedRun.commitSha.substring(0, 7)}
						</span>
						<span className="text-sm text-muted-foreground">
							Duration:{" "}
							{formatDuration(selectedRun.startedAt, selectedRun.completedAt || undefined)}
						</span>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="text-sm font-medium mb-1">Workflow</div>
						<div className="text-sm text-muted-foreground">{selectedRun.workflowName}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Status</div>
						<Badge
							variant={getStatusVariant(selectedRun.status, selectedRun.conclusion || undefined)}
						>
							{getStatusLabel(selectedRun.status, selectedRun.conclusion || undefined)}
						</Badge>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Branch</div>
						<div className="text-sm text-muted-foreground">{selectedRun.branch}</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">Commit</div>
						<div className="text-sm font-mono text-muted-foreground">{selectedRun.commitSha}</div>
					</div>
					{selectedRun.commitMessage && (
						<div>
							<div className="text-sm font-medium mb-1">Commit Message</div>
							<div className="text-sm text-muted-foreground">{selectedRun.commitMessage}</div>
						</div>
					)}
					<div>
						<div className="text-sm font-medium mb-1">Started At</div>
						<div className="text-sm text-muted-foreground">{formatTime(selectedRun.startedAt)}</div>
					</div>
					{selectedRun.completedAt && (
						<div>
							<div className="text-sm font-medium mb-1">Completed At</div>
							<div className="text-sm text-muted-foreground">
								{formatTime(selectedRun.completedAt)}
							</div>
						</div>
					)}
					<div>
						<div className="text-sm font-medium mb-1">Duration</div>
						<div className="text-sm text-muted-foreground">
							{formatDuration(selectedRun.startedAt, selectedRun.completedAt || undefined)}
						</div>
					</div>
					<div>
						<div className="text-sm font-medium mb-1">GitHub</div>
						<a
							href={selectedRun.htmlUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline"
						>
							View on GitHub →
						</a>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Jobs & Steps</CardTitle>
						<Button onClick={handleFetchJobs} disabled={isFetchingJobs} size="sm">
							{isFetchingJobs ? "Fetching..." : "Fetch Jobs & Logs"}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{fetchError && <div className="text-sm text-destructive mb-4">{fetchError}</div>}
					{runId && <CIRunJobs ciRunId={runId as Id<"ciRuns">} />}
				</CardContent>
			</Card>

			{runId && (
				<CIRunAnalysis ciRunId={runId as Id<"ciRuns">} conclusion={selectedRun.conclusion} />
			)}
		</div>
	);
}
