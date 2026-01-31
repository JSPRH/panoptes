// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PyramidLayer = {
	total: number;
	passed: number;
	failed: number;
	label: string;
	color: string;
	gradient: string;
	icon: string;
};

export default function TestPyramid() {
	const pyramidData = useQuery(api.tests.getTestPyramidData, {});

	if (!pyramidData) {
		return (
			<div className="space-y-8">
				<PageHeader
					title="Test Pyramid"
					description="Visual representation of your testing pyramid"
				/>
				<Card>
					<CardContent className="py-12">
						<div className="text-center text-muted-foreground">Loading pyramid data...</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Calculate pyramid dimensions
	const layers: PyramidLayer[] = [
		{
			total: pyramidData.e2e.total,
			passed: pyramidData.e2e.passed,
			failed: pyramidData.e2e.failed,
			label: "E2E Tests",
			color: "from-blue-500 to-blue-600",
			gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
			icon: "🔍",
		},
		{
			total: pyramidData.visual.total,
			passed: 0, // Visual tests don't have passed/failed in the current schema
			failed: 0,
			label: "Visual Tests",
			color: "from-purple-500 to-purple-600",
			gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
			icon: "👁️",
		},
		{
			total: pyramidData.integration.total,
			passed: pyramidData.integration.passed,
			failed: pyramidData.integration.failed,
			label: "Integration Tests",
			color: "from-green-500 to-green-600",
			gradient: "bg-gradient-to-br from-green-500 to-green-600",
			icon: "🔗",
		},
		{
			total: pyramidData.unit.total,
			passed: pyramidData.unit.passed,
			failed: pyramidData.unit.failed,
			label: "Unit Tests",
			color: "from-amber-500 to-amber-600",
			gradient: "bg-gradient-to-br from-amber-500 to-amber-600",
			icon: "⚡",
		},
	].filter((layer) => layer.total > 0); // Only show layers with tests

	const maxTotal = Math.max(...layers.map((l) => l.total), 1);

	// Calculate pyramid widths (trapezoid shape - wider at bottom)
	const getLayerWidth = (index: number, total: number) => {
		if (maxTotal === 0) return 0;
		const baseWidth = 100; // Base layer is 100%
		const ratio = total / maxTotal;
		// Each layer should be progressively wider
		const layerIndex = layers.length - index - 1; // Reverse index (0 = bottom)
		const widthMultiplier = 0.3 + (layerIndex / (layers.length - 1 || 1)) * 0.7; // 30% to 100%
		return Math.max(ratio * baseWidth * widthMultiplier, 15); // Minimum 15% width
	};

	const getPassPercentage = (passed: number, total: number) => {
		if (total === 0) return 0;
		return (passed / total) * 100;
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title="Test Pyramid"
				description="Visual representation of your testing pyramid"
			/>

			<Card className="overflow-hidden">
				<CardHeader>
					<CardTitle>Testing Pyramid Visualization</CardTitle>
					<CardDescription>
						Distribution of unique test definitions by type (not execution count)
					</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Pyramid Visualization */}
					<div className="flex flex-col items-center py-12 px-4">
						<div className="relative w-full max-w-4xl">
							{/* Pyramid Layers */}
							<div className="flex flex-col items-center space-y-0">
								{layers.map((layer, index) => {
									const width = getLayerWidth(index, layer.total);
									const passPercentage = getPassPercentage(layer.passed, layer.total);
									const isBottomLayer = index === layers.length - 1;
									const isTopLayer = index === 0;

									return (
										<div
											key={layer.label}
											className="group relative flex flex-col items-center transition-all duration-500 ease-out hover:scale-105"
											style={{
												width: `${width}%`,
												minWidth: "200px",
											}}
										>
											{/* Pyramid Layer - Trapezoid shape */}
											<div
												className={`relative ${layer.gradient} text-white shadow-lg transition-all duration-500 ease-out group-hover:shadow-2xl`}
												style={{
													clipPath: isTopLayer
														? "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
														: isBottomLayer
															? "polygon(5% 0, 95% 0, 100% 100%, 0 100%)"
															: "polygon(5% 0, 95% 0, 95% 100%, 5% 100%)",
													paddingTop: "1.5rem",
													paddingBottom: "1.5rem",
													paddingLeft: "2rem",
													paddingRight: "2rem",
													minHeight: "80px",
												}}
											>
												{/* Pass/Fail Indicator Bar */}
												{layer.total > 0 && layer.passed + layer.failed > 0 && (
													<div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
														<div
															className="h-full bg-green-300 transition-all duration-700 ease-out"
															style={{ width: `${passPercentage}%` }}
														/>
													</div>
												)}

												{/* Layer Content */}
												<div className="flex items-center justify-between gap-4">
													<div className="flex items-center gap-3">
														<span className="text-2xl">{layer.icon}</span>
														<div>
															<div className="font-bold text-lg">{layer.label}</div>
															<div className="text-sm opacity-90">
																{layer.total.toLocaleString()}{" "}
																{layer.total === 1 ? "test" : "tests"}
															</div>
														</div>
													</div>
													<div className="text-right">
														{layer.passed + layer.failed > 0 ? (
															<>
																<div className="text-2xl font-bold">{layer.passed}</div>
																<div className="text-xs opacity-75">
																	{layer.failed > 0 && (
																		<span className="text-red-200">{layer.failed} failed</span>
																	)}
																	{layer.failed === 0 && (
																		<span className="text-green-200">all passed</span>
																	)}
																</div>
															</>
														) : (
															<div className="text-sm opacity-75">No runs yet</div>
														)}
													</div>
												</div>
											</div>

											{/* Spacing between layers */}
											{!isBottomLayer && (
												<div className="h-2 w-full flex items-center justify-center">
													<div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
												</div>
											)}
										</div>
									);
								})}
							</div>

							{/* Empty State */}
							{layers.length === 0 && (
								<div className="text-center py-16 text-muted-foreground">
									<div className="text-6xl mb-4">📊</div>
									<div className="text-lg font-medium">No test data available</div>
									<div className="text-sm mt-2">Run some tests to see your pyramid</div>
								</div>
							)}
						</div>
					</div>

					{/* Summary Stats Grid */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t">
						{[
							{
								label: "Unit Tests",
								value: pyramidData.unit.total,
								icon: "⚡",
								color: "text-amber-600",
							},
							{
								label: "Integration Tests",
								value: pyramidData.integration.total,
								icon: "🔗",
								color: "text-green-600",
							},
							{
								label: "E2E Tests",
								value: pyramidData.e2e.total,
								icon: "🔍",
								color: "text-blue-600",
							},
							{
								label: "Visual Tests",
								value: pyramidData.visual.total,
								icon: "👁️",
								color: "text-purple-600",
							},
						].map((stat) => (
							<div
								key={stat.label}
								className="text-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
							>
								<div className={`text-3xl mb-2 ${stat.color}`}>{stat.icon}</div>
								<div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
								<div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
							</div>
						))}
					</div>

					{/* Health Metrics */}
					{(pyramidData.unit.passed + pyramidData.unit.failed > 0 ||
						pyramidData.integration.passed + pyramidData.integration.failed > 0 ||
						pyramidData.e2e.passed + pyramidData.e2e.failed > 0) && (
						<div className="mt-8 pt-8 border-t">
							<h3 className="text-lg font-semibold mb-4">Test Health</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{[
									{
										label: "Unit Tests",
										passed: pyramidData.unit.passed,
										failed: pyramidData.unit.failed,
										total: pyramidData.unit.passed + pyramidData.unit.failed,
									},
									{
										label: "Integration Tests",
										passed: pyramidData.integration.passed,
										failed: pyramidData.integration.failed,
										total: pyramidData.integration.passed + pyramidData.integration.failed,
									},
									{
										label: "E2E Tests",
										passed: pyramidData.e2e.passed,
										failed: pyramidData.e2e.failed,
										total: pyramidData.e2e.passed + pyramidData.e2e.failed,
									},
								]
									.filter((m) => m.total > 0)
									.map((metric) => {
										const passRate = (metric.passed / metric.total) * 100;
										return (
											<div key={metric.label} className="p-4 rounded-lg border bg-card">
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm font-medium">{metric.label}</span>
													<span className="text-sm font-bold">{passRate.toFixed(1)}%</span>
												</div>
												<div className="w-full bg-muted rounded-full h-2 mb-2">
													<div
														className={`h-2 rounded-full transition-all duration-500 ${
															passRate >= 90
																? "bg-green-500"
																: passRate >= 70
																	? "bg-yellow-500"
																	: "bg-red-500"
														}`}
														style={{ width: `${passRate}%` }}
													/>
												</div>
												<div className="flex justify-between text-xs text-muted-foreground">
													<span>✅ {metric.passed} passed</span>
													{metric.failed > 0 && (
														<span className="text-red-600">❌ {metric.failed} failed</span>
													)}
												</div>
											</div>
										);
									})}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
