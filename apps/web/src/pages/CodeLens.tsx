// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Test = Doc<"tests">;
type FileCoverageDoc = Doc<"fileCoverage">;

type SortOption = "coverage" | "tests" | "name" | "failures";

function getCoverageVariant(coverage: number): "success" | "warning" | "error" | "neutral" {
	if (coverage >= 80) return "success";
	if (coverage >= 50) return "warning";
	return "error";
}

export default function CodeLens() {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<SortOption>("coverage");
	const [sortDesc, setSortDesc] = useState(true);

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

	const fileStats = useMemo(() => {
		const stats = Array.from(testsByFile.entries())
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
			.filter((stat) => {
				if (!searchQuery) return true;
				return stat.file.toLowerCase().includes(searchQuery.toLowerCase());
			});

		// Sort
		stats.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case "coverage":
					comparison = a.coverage - b.coverage;
					break;
				case "tests":
					comparison = a.total - b.total;
					break;
				case "name":
					comparison = a.file.localeCompare(b.file);
					break;
				case "failures":
					comparison = a.failed - b.failed;
					break;
			}
			return sortDesc ? -comparison : comparison;
		});

		return stats;
	}, [testsByFile, locByFile, searchQuery, sortBy, sortDesc]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Code Lens"
				description="Test coverage mapped to source files (files being tested, not test files)"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Filters & Sorting</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<label htmlFor="search" className="block text-sm font-medium mb-2">
								Search Source Files
							</label>
							<input
								id="search"
								type="text"
								placeholder="Search by file path..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="sort" className="block text-sm font-medium mb-2">
									Sort By
								</label>
								<select
									id="sort"
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value as SortOption)}
									className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
								>
									<option value="coverage">Coverage</option>
									<option value="tests">Number of Tests</option>
									<option value="failures">Failures</option>
									<option value="name">File Name</option>
								</select>
							</div>
							<div>
								<label htmlFor="order" className="block text-sm font-medium mb-2">
									Order
								</label>
								<select
									id="order"
									value={sortDesc ? "desc" : "asc"}
									onChange={(e) => setSortDesc(e.target.value === "desc")}
									className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
								>
									<option value="desc">Descending</option>
									<option value="asc">Ascending</option>
								</select>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Source File Coverage</CardTitle>
					<CardDescription>
						{fileStats.length} source file{fileStats.length !== 1 ? "s" : ""} with test coverage
					</CardDescription>
				</CardHeader>
				<CardContent>
					{fileStats.length > 0 ? (
						<div className="space-y-3">
							{fileStats.map((stat) => (
								<Link
									key={stat.file}
									to={`/coverage/${encodeURIComponent(stat.file)}`}
									className="block"
								>
									<div className="flex flex-col gap-3 py-4 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1 min-w-0">
												<div className="font-medium text-base mb-2 break-words">{stat.file}</div>
												<div className="flex flex-wrap items-center gap-2">
													{stat.locPct != null ? (
														<Badge variant={getCoverageVariant(stat.locPct)}>
															{stat.locPct.toFixed(1)}% coverage
														</Badge>
													) : (
														<Badge variant="neutral">No coverage data</Badge>
													)}
													<Badge variant={stat.failed > 0 ? "error" : "success"}>
														{stat.passed}/{stat.total} passed
													</Badge>
													{stat.failed > 0 && <Badge variant="error">{stat.failed} failing</Badge>}
													{stat.locTotal != null && stat.locTotal > 0 && (
														<span className="text-sm text-muted-foreground">
															{stat.locCovered ?? 0}/{stat.locTotal} lines
														</span>
													)}
												</div>
											</div>
										</div>
										{stat.locTotal != null && stat.locTotal > 0 ? (
											<div className="space-y-1.5">
												<div className="w-full bg-muted rounded-full h-2.5">
													<div
														className={`h-2.5 rounded-full transition-all ${
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
											<div className="space-y-1.5">
												<div className="w-full bg-muted rounded-full h-2.5">
													<div
														className={`h-2.5 rounded-full transition-all ${
															stat.testPassRate >= 80
																? "bg-success"
																: stat.testPassRate >= 50
																	? "bg-warning"
																	: "bg-error"
														}`}
														style={{ width: `${stat.testPassRate}%` }}
													/>
												</div>
												<div className="text-xs text-muted-foreground">
													Test pass rate (no coverage data available)
												</div>
											</div>
										)}
									</div>
								</Link>
							))}
						</div>
					) : tests && tests.length > 0 ? (
						<EmptyState
							title="No matching source files"
							description="Try adjusting your search query to see more results."
							image="/panoptes_under_fruit_tree.png"
						/>
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
