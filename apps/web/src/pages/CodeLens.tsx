// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Test = Doc<"tests">;

export default function CodeLens() {
	const tests = useQuery(api.tests.getTests, { limit: 500 });

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
			const coverage = total > 0 ? (passed / total) * 100 : 0;

			return {
				file,
				total,
				passed,
				failed,
				coverage,
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
										<div className="text-sm text-muted-foreground">
											{stat.passed}/{stat.total} passed ({stat.coverage.toFixed(1)}%)
										</div>
									</div>
									<div className="w-full bg-muted rounded-full h-2">
										<div
											className={`h-2 rounded-full ${
												stat.coverage >= 80
													? "bg-success"
													: stat.coverage >= 50
														? "bg-warning"
														: "bg-error"
											}`}
											style={{ width: `${stat.coverage}%` }}
										/>
									</div>
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
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
