// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Test = Doc<"tests">;

const ITEMS_PER_PAGE = 20;

export default function TestExplorer() {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [currentPage, setCurrentPage] = useState(1);

	const tests = useQuery(api.tests.getTests, {});
	const seedFailingTest = useMutation(api.tests.seedFailingTest);

	const filteredTests = useMemo(() => {
		if (!tests) return [];
		return tests.filter((test: Test) => {
			const matchesSearch =
				test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				test.file.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === "all" || test.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [tests, searchQuery, statusFilter]);

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Test Explorer</h1>
					<p className="text-muted-foreground">Browse and search your tests</p>
				</div>
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
						{filteredTests?.length || 0} test
						{filteredTests?.length !== 1 ? "s" : ""} found
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
								{paginatedTests.map((test: Test) => (
									<div
										key={test._id}
										className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
									>
										<div className="flex-1">
											<div className="font-medium">{test.name}</div>
											<div className="text-sm text-muted-foreground">{test.file}</div>
											{test.suite && (
												<div className="text-xs text-muted-foreground mt-1">
													Suite: {test.suite}
												</div>
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
											{test.status === "failed" && (
												<a
													href={`cursor://anysphere.cursor-deeplink/prompt?file=${encodeURIComponent(test.file)}&text=${encodeURIComponent(
														`Investigate and fix the failing test "${test.name}" in file ${test.file}${test.line ? ` at line ${test.line}` : ""}. Error: ${test.error || "Test failed"}.`
													)}`}
													className="text-xs text-blue-600 hover:text-blue-800 underline"
												>
													Debug in Cursor
												</a>
											)}
										</div>
									</div>
								))}
							</div>
							{totalPages > 1 && (
								<div className="flex items-center justify-between mt-6 pt-4 border-t">
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
						</>
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
