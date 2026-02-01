// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { ChartCard, HistoricalBarChart } from "../components/charts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getPeriodStartTimestamp } from "../lib/chartUtils";

type FeatureWithTests = {
	feature: Doc<"features">;
	tests: Array<{
		mapping: Doc<"testFeatureMappings">;
		testName: string;
		testFile: string;
		testLine?: number;
		testType?: string;
		testStatus?: string;
	}>;
};

/**
 * Generate a Cursor deeplink from a prompt.
 * This is generated dynamically on the frontend to avoid storing URLs that might change.
 */
function generateCursorDeeplinkFromPrompt(prompt: string): string {
	const encodedPrompt = encodeURIComponent(prompt);
	const maxLength = 8000;
	let deeplink = `https://cursor.com/link/prompt?text=${encodedPrompt}`;

	// Truncate if necessary to stay under URL length limit
	if (deeplink.length > maxLength) {
		const truncatedPrompt = prompt.substring(0, Math.floor(prompt.length * 0.7));
		const encodedTruncated = encodeURIComponent(truncatedPrompt);
		deeplink = `https://cursor.com/link/prompt?text=${encodedTruncated}`;

		if (deeplink.length > maxLength) {
			const ultraShortPrompt = prompt.substring(0, 500);
			const encodedUltraShort = encodeURIComponent(ultraShortPrompt);
			deeplink = `https://cursor.com/link/prompt?text=${encodedUltraShort}`;
		}
	}

	return deeplink;
}

function getStatusVariant(status: string): "success" | "error" | "info" | "neutral" {
	if (status === "passed") return "success";
	if (status === "failed") return "error";
	if (status === "running") return "info";
	return "neutral";
}

export default function FeatureDetail() {
	const { featureId } = useParams<{ featureId: string }>();
	const [period, setPeriod] = useState("90d");

	// biome-ignore lint/suspicious/noExplicitAny: API types not generated yet for new tables
	const featuresApi = (api as any).features;

	const featureWithTests = useQuery(
		featuresApi?.getFeatureWithTests,
		featureId ? { featureId: featureId as Id<"features"> } : "skip"
	) as FeatureWithTests | null | undefined;

	const startTimestamp = getPeriodStartTimestamp(period);
	const testHistory = useQuery(
		featuresApi?.getFeatureTestHistory,
		featureId && startTimestamp
			? {
					featureId: featureId as Id<"features">,
					startTimestamp,
					limit: 100,
				}
			: featureId
				? {
						featureId: featureId as Id<"features">,
						limit: 100,
					}
				: "skip"
	) as
		| Array<{ date: number; passed: number; failed: number; skipped: number; total: number }>
		| undefined;

	// Calculate stats
	const stats = useMemo(() => {
		if (!featureWithTests || !testHistory) return null;

		const tests = featureWithTests.tests;
		const totalTests = tests.length;
		const passedTests = tests.filter((t) => t.testStatus === "passed").length;
		const failedTests = tests.filter((t) => t.testStatus === "failed").length;
		const skippedTests = tests.filter((t) => t.testStatus === "skipped").length;
		const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

		return {
			totalTests,
			passedTests,
			failedTests,
			skippedTests,
			passRate,
		};
	}, [featureWithTests, testHistory]);

	// Prepare chart data
	const executionHistoryData = useMemo(() => {
		if (!testHistory || testHistory.length === 0) return [];
		// Take last 20 data points for the bar chart
		const recent = testHistory.slice(-20);
		return recent.map((point, index) => ({
			label: `#${testHistory.length - recent.length + index + 1}`,
			date: point.date,
			passed: point.passed,
			failed: point.failed,
			skipped: point.skipped,
		}));
	}, [testHistory]);

	const handleEnhanceCoverage = () => {
		if (!featureWithTests) return;

		const feature = featureWithTests.feature;
		const relatedFilesList = feature.relatedFiles.slice(0, 10).join(", ");
		const moreFiles =
			feature.relatedFiles.length > 10 ? ` (+${feature.relatedFiles.length - 10} more)` : "";

		const prompt = `Enhance test coverage for feature: ${feature.name}

Feature Description: ${feature.description}
${feature.category ? `Category: ${feature.category}` : ""}
${feature.userJourney ? `User Journey: ${feature.userJourney}` : ""}

Related Files:
${relatedFilesList}${moreFiles}

Current Test Coverage:
- Total Tests: ${featureWithTests.tests.length}
- Pass Rate: ${stats?.passRate.toFixed(1) ?? 0}%
- Confirmed Mappings: ${featureWithTests.tests.filter((t) => t.mapping.isUserConfirmed).length}

Please analyze the related files and suggest additional tests to improve coverage for this feature. Focus on:
1. Edge cases not currently tested
2. Integration scenarios
3. Error handling paths
4. User journey coverage
5. Boundary conditions and validation

Generate comprehensive test cases that would increase confidence in this feature's reliability.`;

		const deeplink = generateCursorDeeplinkFromPrompt(prompt);
		window.open(deeplink, "_blank");
	};

	if (!featureId) {
		return (
			<div className="space-y-8">
				<PageHeader title="Feature Detail" description="View feature details and test coverage" />
				<EmptyState
					title="No feature selected"
					description="Use a valid feature link from Feature Explorer."
					action={<Link to="/features">Back to Feature Explorer</Link>}
				/>
			</div>
		);
	}

	if (featureWithTests === undefined) {
		return (
			<div className="space-y-8">
				<PageHeader title="Feature Detail" description="View feature details and test coverage" />
				<LoadingSpinner />
			</div>
		);
	}

	if (featureWithTests === null) {
		return (
			<div className="space-y-8">
				<PageHeader title="Feature Detail" description="View feature details and test coverage" />
				<EmptyState
					title="Feature not found"
					description="This feature does not exist or was archived."
					action={<Link to="/features">Back to Feature Explorer</Link>}
				/>
			</div>
		);
	}

	const feature = featureWithTests.feature;

	return (
		<div className="space-y-8">
			<PageHeader title="Feature Detail" description="View feature details and test coverage" />
			<p className="text-sm text-muted-foreground">
				<Link to="/features" className="text-primary hover:underline">
					Feature Explorer
				</Link>
				{" → Feature Detail"}
			</p>

			{/* Feature Header */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-2xl">{feature.name}</CardTitle>
							<CardDescription className="mt-2">{feature.description}</CardDescription>
							<div className="flex flex-wrap items-center gap-2 mt-4">
								{feature.category && (
									<Badge variant="neutral" className="text-sm">
										{feature.category}
									</Badge>
								)}
								{feature.isUserDefined && (
									<Badge variant="info" className="text-sm">
										User Defined
									</Badge>
								)}
								<Badge variant="neutral" className="text-sm">
									{Math.round(feature.confidence * 100)}% confidence
								</Badge>
								{feature.userJourney && (
									<Badge variant="neutral" className="text-sm">
										{feature.userJourney}
									</Badge>
								)}
							</div>
						</div>
						<Button onClick={handleEnhanceCoverage} variant="default" size="sm">
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
							Enhance Test Coverage with Cursor
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{feature.relatedFiles.length > 0 && (
						<div>
							<div className="text-sm font-medium mb-2">Related Files</div>
							<div className="flex flex-wrap gap-2">
								{feature.relatedFiles.slice(0, 20).map((file: string) => (
									<Badge key={file} variant="neutral" className="text-xs font-mono">
										{file}
									</Badge>
								))}
								{feature.relatedFiles.length > 20 && (
									<Badge variant="neutral" className="text-xs">
										+{feature.relatedFiles.length - 20} more
									</Badge>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-2xl">{stats.totalTests}</CardTitle>
							<CardDescription>Total Tests</CardDescription>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-2xl">{stats.passRate.toFixed(1)}%</CardTitle>
							<CardDescription>Pass Rate</CardDescription>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-2xl text-green-600">{stats.passedTests}</CardTitle>
							<CardDescription>Passed</CardDescription>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-2xl text-red-600">{stats.failedTests}</CardTitle>
							<CardDescription>Failed</CardDescription>
						</CardHeader>
					</Card>
				</div>
			)}

			{/* Test History Chart */}
			{executionHistoryData.length > 0 && (
				<ChartCard
					title="Test Execution History"
					description={`Test run results over time (${period})`}
					selectedPeriod={period}
					onPeriodChange={setPeriod}
				>
					<HistoricalBarChart data={executionHistoryData} stacked height={250} />
				</ChartCard>
			)}

			{/* Mapped Tests */}
			<Card>
				<CardHeader>
					<CardTitle>Mapped Tests</CardTitle>
					<CardDescription>
						{featureWithTests.tests.length} test{featureWithTests.tests.length !== 1 ? "s" : ""}{" "}
						mapped to this feature
					</CardDescription>
				</CardHeader>
				<CardContent>
					{featureWithTests.tests.length > 0 ? (
						<div className="space-y-2">
							{featureWithTests.tests.map((test) => {
								const testDetailUrl = `/tests/${feature.projectId}/${encodeURIComponent(test.testName)}/${encodeURIComponent(test.testFile)}${test.testLine ? `?line=${test.testLine}` : ""}`;
								return (
									<Link
										key={test.mapping._id}
										to={testDetailUrl}
										className="block w-full text-left rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="font-medium text-sm font-mono">{test.testName}</div>
												<div className="text-xs text-muted-foreground">
													{test.testFile}
													{test.testLine && `:${test.testLine}`}
													{test.testType && ` (${test.testType})`}
												</div>
												<div className="text-xs text-muted-foreground italic mt-1">
													{test.mapping.reason}
												</div>
											</div>
											<div className="flex items-center gap-2">
												{test.testStatus && (
													<Badge variant={getStatusVariant(test.testStatus)}>
														{test.testStatus}
													</Badge>
												)}
												<div className="text-sm text-muted-foreground">
													{Math.round(test.mapping.confidence * 100)}%
												</div>
												{test.mapping.isUserConfirmed && (
													<Badge variant="success" className="text-xs">
														Confirmed
													</Badge>
												)}
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					) : (
						<EmptyState
							title="No tests mapped"
							description="No tests are currently mapped to this feature. Run a codebase analysis to discover test mappings."
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
