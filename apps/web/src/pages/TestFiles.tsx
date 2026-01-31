// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

function getFrameworkColor(framework: string): string {
	switch (framework) {
		case "vitest":
			return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
		case "playwright":
			return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
		case "jest":
			return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
		default:
			return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
	}
}

function getTestTypeColor(testType: string): string {
	switch (testType) {
		case "unit":
			return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
		case "integration":
			return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
		case "e2e":
			return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
		case "visual":
			return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20";
		default:
			return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
	}
}

export default function TestFiles() {
	const [searchQuery, setSearchQuery] = useState("");
	const [testTypeFilter, setTestTypeFilter] = useState<string>("all");
	const [frameworkFilter, setFrameworkFilter] = useState<string>("all");

	const groups = useQuery(api.tests.getTestsByTestFile, {});

	const filteredGroups = useMemo(() => {
		if (!groups) return [];
		return groups.filter((group) => {
			const matchesSearch =
				!searchQuery ||
				group.testFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
				group.tests.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesTestType = testTypeFilter === "all" || group.testType === testTypeFilter;
			const matchesFramework = frameworkFilter === "all" || group.framework === frameworkFilter;
			return matchesSearch && matchesTestType && matchesFramework;
		});
	}, [groups, searchQuery, testTypeFilter, frameworkFilter]);

	const uniqueTestTypes = useMemo(() => {
		if (!groups) return [];
		return Array.from(new Set(groups.map((g) => g.testType))).sort();
	}, [groups]);

	const uniqueFrameworks = useMemo(() => {
		if (!groups) return [];
		return Array.from(new Set(groups.map((g) => g.framework))).sort();
	}, [groups]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Test Files"
				description="Tests organized by test file, test type, and framework"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<label htmlFor="search" className="block text-sm font-medium mb-2">
								Search
							</label>
							<input
								id="search"
								type="text"
								placeholder="Search by test file or test name..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="testType" className="block text-sm font-medium mb-2">
									Test Type
								</label>
								<select
									id="testType"
									value={testTypeFilter}
									onChange={(e) => setTestTypeFilter(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
								>
									<option value="all">All Types</option>
									{uniqueTestTypes.map((type) => (
										<option key={type} value={type}>
											{type.charAt(0).toUpperCase() + type.slice(1)}
										</option>
									))}
								</select>
							</div>
							<div>
								<label htmlFor="framework" className="block text-sm font-medium mb-2">
									Framework
								</label>
								<select
									id="framework"
									value={frameworkFilter}
									onChange={(e) => setFrameworkFilter(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
								>
									<option value="all">All Frameworks</option>
									{uniqueFrameworks.map((framework) => (
										<option key={framework} value={framework}>
											{framework.charAt(0).toUpperCase() + framework.slice(1)}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Test Files</CardTitle>
					<CardDescription>
						{filteredGroups.length} test file group{filteredGroups.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					{filteredGroups.length > 0 ? (
						<div className="space-y-4">
							{filteredGroups.map((group) => (
								<div
									key={`${group.testFile}-${group.testType}-${group.framework}`}
									className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
								>
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<div className="font-medium text-lg mb-2">{group.testFile}</div>
											<div className="flex flex-wrap gap-2">
												<Badge className={getTestTypeColor(group.testType)}>{group.testType}</Badge>
												<Badge className={getFrameworkColor(group.framework)}>
													{group.framework}
												</Badge>
											</div>
										</div>
										<div className="text-sm text-muted-foreground">
											<div>
												<span className="text-success">{group.passed} passed</span>
												{group.failed > 0 && (
													<>
														{" · "}
														<span className="text-error">{group.failed} failed</span>
													</>
												)}
												{group.skipped > 0 && (
													<>
														{" · "}
														<span className="text-muted-foreground">{group.skipped} skipped</span>
													</>
												)}
											</div>
											<div className="mt-1">
												{group.tests.length} test{group.tests.length !== 1 ? "s" : ""}
											</div>
										</div>
									</div>
									<div className="space-y-1 mt-3">
										{group.tests.slice(0, 10).map((test) => (
											<Link
												key={test._id}
												to={`/tests/${test.projectId}/${encodeURIComponent(test.name)}/${encodeURIComponent(test.file)}`}
												className="block py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
											>
												<div className="flex items-center justify-between">
													<span className="text-sm">{test.name}</span>
													<Badge
														variant={
															test.status === "passed"
																? "success"
																: test.status === "failed"
																	? "error"
																	: "neutral"
														}
													>
														{test.status}
													</Badge>
												</div>
											</Link>
										))}
										{group.tests.length > 10 && (
											<div className="text-xs text-muted-foreground pt-2">
												+{group.tests.length - 10} more test
												{group.tests.length - 10 !== 1 ? "s" : ""}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					) : groups && groups.length === 0 ? (
						<EmptyState
							title="No test files found"
							description="Run your tests with a Panoptes reporter to see tests organized by test file here."
							image="/panoptes_under_fruit_tree.png"
						/>
					) : (
						<EmptyState
							title="No matching test files"
							description="Try adjusting your filters to see more results."
							image="/panoptes_under_fruit_tree.png"
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
