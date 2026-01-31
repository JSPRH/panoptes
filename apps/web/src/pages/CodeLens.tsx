// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Test = Doc<"tests">;
type FileCoverageDoc = Doc<"fileCoverage">;

export default function CodeLens() {
	const tests = useQuery(api.tests.getTests, { limit: 500 });
	const testRuns = useQuery(api.tests.getTestRuns, { limit: 10 });
	const latestTestRunId = testRuns?.[0]?._id;
	const coverageForRun = useQuery(
		api.tests.getCoverageForTestRun,
		latestTestRunId ? { testRunId: latestTestRunId } : "skip"
	);

	// Map file path -> LOC coverage (from latest run that has coverage)
	const locByFile = useMemo(() => {
		const map = new Map<string, FileCoverageDoc>();
		if (coverageForRun?.length) {
			for (const fc of coverageForRun) {
				map.set(fc.file, fc);
			}
		}
		return map;
	}, [coverageForRun]);

	// Group tests by file
	const testsByFile = new Map<string, Test[]>();
	if (tests) {
		for (const test of tests) {
			if (!testsByFile.has(test.file)) {
				testsByFile.set(test.file, []);
			}
			const fileTests = testsByFile.get(test.file);
			if (fileTests) {
				fileTests.push(test);
			}
		}
	}

	const fileStats = Array.from(testsByFile.entries())
		.map(([file, fileTests]) => {
			const passed = fileTests.filter((t: Test) => t.status === "passed").length;
			const failed = fileTests.filter((t: Test) => t.status === "failed").length;
			const total = fileTests.length;
			const testPassRate = total > 0 ? (passed / total) * 100 : 0;
			const loc = locByFile.get(file);
			const locPct =
				loc && loc.linesTotal > 0 ? (loc.linesCovered / loc.linesTotal) * 100 : undefined;

			return {
				file,
				total,
				passed,
				failed,
				testPassRate,
				locCovered: loc?.linesCovered,
				locTotal: loc?.linesTotal,
				locPct,
				// Use LOC coverage as the main coverage metric if available, otherwise fall back to test pass rate
				coverage: locPct ?? testPassRate,
			};
		})
		.sort((a, b) => b.total - a.total);

	return (
		<div className="space-y-8">
			<PageHeader title="Code Lens" description="Test coverage mapped to source files" />

			<Card>
				<CardHeader>
					<CardTitle>File Coverage</CardTitle>
					<CardDescription>Tests organized by source file</CardDescription>
				</CardHeader>
				<CardContent>
					{fileStats.length > 0 ? (
						<div className="space-y-2">
							{fileStats.map((stat) => (
								<div
									key={stat.file}
									className="flex flex-col gap-2 py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="font-medium">{stat.file}</div>
										<div className="text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
											<span>
												{stat.passed}/{stat.total} tests passed ({stat.testPassRate.toFixed(1)}%)
											</span>
											{stat.locTotal != null && stat.locTotal > 0 && (
												<span>
													· {stat.locCovered ?? 0}/{stat.locTotal} lines covered
													{stat.locPct != null && ` (${stat.locPct.toFixed(1)}%)`}
												</span>
											)}
										</div>
									</div>
									{stat.locTotal != null && stat.locTotal > 0 ? (
										<div className="space-y-1">
											<div className="w-full bg-muted rounded-full h-2">
												<div
													className={`h-2 rounded-full ${
														(stat.locPct ?? 0) >= 80
															? "bg-success"
															: (stat.locPct ?? 0) >= 50
																? "bg-warning"
																: "bg-error"
													}`}
													style={{
														width: `${Math.min(100, stat.locPct ?? 0)}%`,
													}}
												/>
											</div>
											<div className="text-xs text-muted-foreground">Lines of Code Coverage</div>
										</div>
									) : (
										<div className="w-full bg-muted rounded-full h-2">
											<div
												className={`h-2 rounded-full ${
													stat.testPassRate >= 80
														? "bg-success"
														: stat.testPassRate >= 50
															? "bg-warning"
															: "bg-error"
												}`}
												style={{ width: `${stat.testPassRate}%` }}
											/>
											<div className="text-xs text-muted-foreground mt-0.5">
												Test pass rate (no coverage data)
											</div>
										</div>
									)}
									{stat.failed > 0 && (
										<div className="text-sm text-error">
											{stat.failed} test{stat.failed !== 1 ? "s" : ""} failing
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<EmptyState
							title="No test data available"
							description="Run your tests with a Panoptes reporter to see code coverage mapped to source files here."
							image="/panoptes_under_fruit_tree.png"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
