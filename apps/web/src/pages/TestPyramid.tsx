// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function TestPyramid() {
	const pyramidData = useQuery(api.tests.getTestPyramidData, {});

	if (!pyramidData) {
		return <div>Loading...</div>;
	}

	const maxTotal = Math.max(
		pyramidData.unit.total,
		pyramidData.integration.total,
		pyramidData.e2e.total,
		pyramidData.visual.total
	);

	const getWidth = (total: number) => {
		if (maxTotal === 0) return 0;
		return (total / maxTotal) * 100;
	};

	const getHeight = (total: number) => {
		if (maxTotal === 0) return 0;
		return Math.max((total / maxTotal) * 200, 40);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Test Pyramid</h1>
				<p className="text-muted-foreground">Visual representation of your testing pyramid</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Testing Pyramid Visualization</CardTitle>
					<CardDescription>Distribution of tests across different test types</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center space-y-4 py-8">
						{/* Visual Pyramid */}
						<div className="flex flex-col items-center space-y-2">
							{/* E2E Tests - Top, smallest */}
							<div className="flex flex-col items-center">
								<div
									className="bg-blue-500 text-white px-4 py-2 rounded-t-lg flex items-center justify-center min-w-[120px]"
									style={{
										width: `${getWidth(pyramidData.e2e.total)}%`,
										height: `${getHeight(pyramidData.e2e.total)}px`,
									}}
								>
									<div className="text-center">
										<div className="font-bold">E2E</div>
										<div className="text-xs">{pyramidData.e2e.total} tests</div>
									</div>
								</div>
								<div className="text-sm text-muted-foreground mt-1">
									{pyramidData.e2e.passed} passed, {pyramidData.e2e.failed} failed
								</div>
							</div>

							{/* Integration Tests - Middle */}
							<div className="flex flex-col items-center">
								<div
									className="bg-green-500 text-white px-4 py-2 rounded-t-lg flex items-center justify-center min-w-[180px]"
									style={{
										width: `${getWidth(pyramidData.integration.total)}%`,
										height: `${getHeight(pyramidData.integration.total)}px`,
									}}
								>
									<div className="text-center">
										<div className="font-bold">Integration</div>
										<div className="text-xs">{pyramidData.integration.total} tests</div>
									</div>
								</div>
								<div className="text-sm text-muted-foreground mt-1">
									{pyramidData.integration.passed} passed, {pyramidData.integration.failed} failed
								</div>
							</div>

							{/* Unit Tests - Base, largest */}
							<div className="flex flex-col items-center">
								<div
									className="bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center justify-center min-w-[240px]"
									style={{
										width: `${getWidth(pyramidData.unit.total)}%`,
										height: `${getHeight(pyramidData.unit.total)}px`,
									}}
								>
									<div className="text-center">
										<div className="font-bold">Unit</div>
										<div className="text-xs">{pyramidData.unit.total} tests</div>
									</div>
								</div>
								<div className="text-sm text-muted-foreground mt-1">
									{pyramidData.unit.passed} passed, {pyramidData.unit.failed} failed
								</div>
							</div>
						</div>
					</div>

					{/* Summary Stats */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
						<div className="text-center">
							<div className="text-2xl font-bold">{pyramidData.unit.total}</div>
							<div className="text-sm text-muted-foreground">Unit Tests</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold">{pyramidData.integration.total}</div>
							<div className="text-sm text-muted-foreground">Integration Tests</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold">{pyramidData.e2e.total}</div>
							<div className="text-sm text-muted-foreground">E2E Tests</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold">{pyramidData.visual.total}</div>
							<div className="text-sm text-muted-foreground">Visual Tests</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
