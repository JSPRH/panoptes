// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function CodeLens() {
	const tests = useQuery(api.tests.getTests, { limit: 500 });

	// Group tests by file
	const testsByFile = new Map<string, typeof tests>();
	if (tests) {
		for (const test of tests) {
			if (!testsByFile.has(test.file)) {
				testsByFile.set(test.file, []);
			}
			testsByFile.get(test.file)!.push(test);
		}
	}

	const fileStats = Array.from(testsByFile.entries())
		.map(([file, fileTests]) => {
			const passed = fileTests.filter((t) => t.status === "passed").length;
			const failed = fileTests.filter((t) => t.status === "failed").length;
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
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Code Lens</h1>
				<p className="text-muted-foreground">Test coverage mapped to source files</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>File Coverage</CardTitle>
					<CardDescription>Tests organized by source file</CardDescription>
				</CardHeader>
				<CardContent>
					{fileStats.length > 0 ? (
						<div className="space-y-4">
							{fileStats.map((stat) => (
								<div key={stat.file} className="border rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<div className="font-medium">{stat.file}</div>
										<div className="text-sm text-muted-foreground">
											{stat.passed}/{stat.total} passed ({stat.coverage.toFixed(1)}%)
										</div>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className={`h-2 rounded-full ${
												stat.coverage >= 80
													? "bg-green-500"
													: stat.coverage >= 50
														? "bg-yellow-500"
														: "bg-red-500"
											}`}
											style={{ width: `${stat.coverage}%` }}
										/>
									</div>
									{stat.failed > 0 && (
										<div className="mt-2 text-sm text-red-600">
											{stat.failed} test{stat.failed !== 1 ? "s" : ""} failing
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No test data available. Run your tests with a Panoptes reporter to see code coverage
							here.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
