// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type TestExecution = Doc<"tests"> & { ci?: boolean; commitSha?: string; runStartedAt?: number };

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

export default function TestDetail() {
	const { projectId, name, file } = useParams<{ projectId: string; name: string; file: string }>();
	const [searchParams] = useSearchParams();
	const lineParam = searchParams.get("line");
	const line = lineParam ? Number.parseInt(lineParam, 10) : undefined;

	const executions = useQuery(
		api.tests.getTestDefinitionExecutions,
		projectId && name && file
			? {
					projectId: projectId as Id<"projects">,
					name: decodeURIComponent(name),
					file: decodeURIComponent(file),
					line,
					limit: 100,
				}
			: "skip"
	);

	const stats = useMemo(() => {
		if (!executions) return null;
		const total = executions.length;
		const passed = executions.filter((e) => e.status === "passed").length;
		const failed = executions.filter((e) => e.status === "failed").length;
		const skipped = executions.filter((e) => e.status === "skipped").length;
		const avgDuration = executions.reduce((sum, e) => sum + e.duration, 0) / executions.length || 0;
		const successRate = total > 0 ? (passed / total) * 100 : 0;
		return { total, passed, failed, skipped, avgDuration, successRate };
	}, [executions]);

	if (projectId === undefined || name === undefined || file === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Definition" description="View all executions of a test" />
				<EmptyState
					title="No test selected"
					description="Use a valid test link from Test Runs or Test Explorer."
					action={<Link to="/runs">Back to Test Runs</Link>}
				/>
			</div>
		);
	}

	const decodedName = decodeURIComponent(name);
	const decodedFile = decodeURIComponent(file);

	if (executions === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Test Definition" description="View all executions of a test" />
				<p className="text-muted-foreground">Loading…</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader title="Test Definition" description="All executions of this test" />
			<p className="text-sm text-muted-foreground">
				<Link to="/runs" className="text-primary hover:underline">
					Test Runs
				</Link>
				{" → Test Definition"}
			</p>

			<Card>
				<CardHeader>
					<CardTitle>Test Definition</CardTitle>
					<CardDescription>
						{decodedName} • {decodedFile}
						{line != null && `:${line}`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{stats && (
						<div className="space-y-4">
							<div className="flex flex-wrap items-center gap-4">
								<div>
									<span className="text-sm text-muted-foreground">Total Executions: </span>
									<span className="font-medium">{stats.total}</span>
								</div>
								<div>
									<span className="text-sm text-muted-foreground">Success Rate: </span>
									<span className="font-medium">{stats.successRate.toFixed(1)}%</span>
								</div>
								<div>
									<span className="text-sm text-muted-foreground">Avg Duration: </span>
									<span className="font-medium">{formatDuration(stats.avgDuration)}</span>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="success">{stats.passed} passed</Badge>
								{stats.failed > 0 && <Badge variant="error">{stats.failed} failed</Badge>}
								{stats.skipped > 0 && <Badge variant="neutral">{stats.skipped} skipped</Badge>}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Executions</CardTitle>
					<CardDescription>
						{executions?.length ?? 0} execution{executions?.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					{executions && executions.length > 0 ? (
						<div className="space-y-2">
							{executions.map((execution: TestExecution) => (
								<Link
									key={execution._id}
									to={`/executions/${execution._id}`}
									className="block w-full text-left rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
								>
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<div className="font-medium text-sm">{execution.name}</div>
											<div className="text-xs text-muted-foreground">
												{execution.file}
												{execution.line != null && `:${execution.line}`}
											</div>
											{execution.runStartedAt && (
												<div className="text-xs text-muted-foreground mt-1">
													{formatTime(execution.runStartedAt)}
												</div>
											)}
											{execution.error && (
												<div className="text-xs text-destructive mt-1 truncate max-w-full">
													{execution.error}
												</div>
											)}
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">
												{formatDuration(execution.duration)}
											</span>
											<Badge variant={getStatusVariant(execution.status)}>{execution.status}</Badge>
											{execution.ci != null && (
												<Badge variant={execution.ci ? "info" : "neutral"}>
													{execution.ci ? "CI" : "Local"}
												</Badge>
											)}
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						<EmptyState
							title="No executions found"
							description="This test has not been executed yet, or executions have been removed."
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
