// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Test = Doc<"tests">;

export default function TestExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const tests = useQuery(api.tests.getTests, { limit: 100 });

	const filteredTests = tests?.filter((test: Test) => {
		const matchesSearch =
			test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			test.file.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === "all" || test.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Test Explorer</h1>
				<p className="text-muted-foreground">Browse and search your tests</p>
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
						{filteredTests?.length || 0} test
						{filteredTests?.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					{filteredTests && filteredTests.length > 0 ? (
						<div className="space-y-2">
							{filteredTests.map((test: Test) => (
								<div
									key={test._id}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
								>
									<div className="flex-1">
										<div className="font-medium">{test.name}</div>
										<div className="text-sm text-muted-foreground">{test.file}</div>
										{test.suite && (
											<div className="text-xs text-muted-foreground mt-1">Suite: {test.suite}</div>
										)}
									</div>
									<div className="flex items-center gap-4">
										<div className="text-sm text-muted-foreground">{test.duration}ms</div>
										<div
											className={`px-2 py-1 rounded text-xs font-medium ${
												test.status === "passed"
													? "bg-green-100 text-green-800"
													: test.status === "failed"
														? "bg-red-100 text-red-800"
														: "bg-gray-100 text-gray-800"
											}`}
										>
											{test.status}
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No tests found. Run your tests with a Panoptes reporter to see results here.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
