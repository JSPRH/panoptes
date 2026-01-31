// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import { useQuery } from "convex/react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PyramidLayer = {
	total: number;
	passed: number;
	failed: number;
	label: string;
	shortLabel: string;
	color: {
		bg: string;
		border: string;
		text: string;
		accent: string;
	};
	order: number;
};

const LAYER_CONFIGS = {
	e2e: {
		label: "End-to-End",
		shortLabel: "E2E",
		color: {
			bg: "bg-blue-50 dark:bg-blue-950/20",
			border: "border-blue-200 dark:border-blue-800",
			text: "text-blue-700 dark:text-blue-300",
			accent: "bg-blue-500",
		},
		order: 0,
	},
	visual: {
		label: "Visual",
		shortLabel: "Visual",
		color: {
			bg: "bg-purple-50 dark:bg-purple-950/20",
			border: "border-purple-200 dark:border-purple-800",
			text: "text-purple-700 dark:text-purple-300",
			accent: "bg-purple-500",
		},
		order: 1,
	},
	integration: {
		label: "Integration",
		shortLabel: "Integration",
		color: {
			bg: "bg-emerald-50 dark:bg-emerald-950/20",
			border: "border-emerald-200 dark:border-emerald-800",
			text: "text-emerald-700 dark:text-emerald-300",
			accent: "bg-emerald-500",
		},
		order: 2,
	},
	unit: {
		label: "Unit",
		shortLabel: "Unit",
		color: {
			bg: "bg-amber-50 dark:bg-amber-950/20",
			border: "border-amber-200 dark:border-amber-800",
			text: "text-amber-700 dark:text-amber-300",
			accent: "bg-amber-500",
		},
		order: 3,
	},
} as const;

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
					<CardContent className="py-16">
						<div className="text-center text-muted-foreground">Loading pyramid data...</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Build layers in pyramid order (top to bottom: E2E, Visual, Integration, Unit)
	const layers: PyramidLayer[] = [
		{
			total: pyramidData.e2e.total,
			passed: pyramidData.e2e.passed,
			failed: pyramidData.e2e.failed,
			label: LAYER_CONFIGS.e2e.label,
			shortLabel: LAYER_CONFIGS.e2e.shortLabel,
			color: LAYER_CONFIGS.e2e.color,
			order: LAYER_CONFIGS.e2e.order,
		},
		{
			total: pyramidData.visual.total,
			passed: 0,
			failed: 0,
			label: LAYER_CONFIGS.visual.label,
			shortLabel: LAYER_CONFIGS.visual.shortLabel,
			color: LAYER_CONFIGS.visual.color,
			order: LAYER_CONFIGS.visual.order,
		},
		{
			total: pyramidData.integration.total,
			passed: pyramidData.integration.passed,
			failed: pyramidData.integration.failed,
			label: LAYER_CONFIGS.integration.label,
			shortLabel: LAYER_CONFIGS.integration.shortLabel,
			color: LAYER_CONFIGS.integration.color,
			order: LAYER_CONFIGS.integration.order,
		},
		{
			total: pyramidData.unit.total,
			passed: pyramidData.unit.passed,
			failed: pyramidData.unit.failed,
			label: LAYER_CONFIGS.unit.label,
			shortLabel: LAYER_CONFIGS.unit.shortLabel,
			color: LAYER_CONFIGS.unit.color,
			order: LAYER_CONFIGS.unit.order,
		},
	].filter((layer) => layer.total > 0);

	const maxTotal = Math.max(...layers.map((l) => l.total), 1);
	const totalTests = layers.reduce((sum, layer) => sum + layer.total, 0);

	const getPassPercentage = (passed: number, total: number) => {
		if (total === 0) return 0;
		return (passed / total) * 100;
	};

	const getLayerWidth = (index: number, total: number) => {
		if (maxTotal === 0) return 0;
		// Pyramid: bottom layer (index = layers.length - 1) is widest
		const layerIndex = layers.length - index - 1; // Reverse: 0 = bottom, higher = top
		const baseRatio = total / maxTotal;
		// Progressive width: 100% at bottom, decreasing toward top
		const widthMultiplier = 0.4 + (layerIndex / Math.max(layers.length - 1, 1)) * 0.6; // 40% to 100%
		return Math.max(baseRatio * widthMultiplier * 100, 20); // Min 20% width
	};

	return (
		<div className="space-y-8">
			<PageHeader title="Test Pyramid" description="Distribution of test definitions by type" />

			{/* Main Pyramid Visualization */}
			<Card className="overflow-hidden">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-xl">Test Distribution</CardTitle>
							<CardDescription className="mt-1">
								{totalTests.toLocaleString()} total test{totalTests !== 1 ? "s" : ""} across{" "}
								{layers.length} categor{layers.length !== 1 ? "ies" : "y"}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{layers.length === 0 ? (
						<div className="text-center py-20 text-muted-foreground">
							<div className="text-4xl mb-3 opacity-50">📊</div>
							<div className="text-base font-medium">No test data available</div>
							<div className="text-sm mt-1.5">Run some tests to see your pyramid</div>
						</div>
					) : (
						<div className="py-8">
							{/* Pyramid Layers - Top to Bottom */}
							<div className="flex flex-col items-center gap-3 max-w-3xl mx-auto">
								{layers.map((layer, index) => {
									const width = getLayerWidth(index, layer.total);
									const passPercentage = getPassPercentage(layer.passed, layer.total);
									const hasResults = layer.passed + layer.failed > 0;
									const isBottomLayer = index === layers.length - 1;
									const isTopLayer = index === 0;

									return (
										<div
											key={layer.label}
											className="group relative w-full transition-all duration-300"
											style={{ maxWidth: `${width}%` }}
										>
											<div
												className={`
													relative border-2 rounded-lg px-6 py-4
													${layer.color.bg} ${layer.color.border}
													transition-all duration-300
													group-hover:shadow-lg group-hover:scale-[1.02]
													${isTopLayer ? "rounded-t-lg" : ""}
													${isBottomLayer ? "rounded-b-lg" : ""}
												`}
											>
												{/* Health indicator bar */}
												{hasResults && (
													<div className="absolute top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 rounded-t-lg overflow-hidden">
														<div
															className={`h-full ${layer.color.accent} transition-all duration-700`}
															style={{ width: `${passPercentage}%` }}
														/>
													</div>
												)}

												<div className="flex items-center justify-between gap-6">
													<div className="flex items-center gap-4 flex-1 min-w-0">
														{/* Color accent */}
														<div
															className={`w-1 h-12 rounded-full ${layer.color.accent} flex-shrink-0`}
														/>

														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2 mb-1">
																<h3
																	className={`font-semibold text-base ${layer.color.text} truncate`}
																>
																	{layer.label}
																</h3>
																{hasResults && (
																	<Badge
																		variant={
																			passPercentage >= 90
																				? "success"
																				: passPercentage >= 70
																					? "warning"
																					: "error"
																		}
																		className="text-xs"
																	>
																		{passPercentage.toFixed(0)}%
																	</Badge>
																)}
															</div>
															<div className="text-sm text-muted-foreground">
																{layer.total.toLocaleString()} test{layer.total !== 1 ? "s" : ""}
															</div>
														</div>
													</div>

													{hasResults && (
														<div className="text-right flex-shrink-0">
															<div className="text-2xl font-bold tabular-nums">
																{layer.passed.toLocaleString()}
															</div>
															<div className="text-xs text-muted-foreground mt-0.5">
																{layer.failed > 0 ? (
																	<span className="text-destructive">{layer.failed} failed</span>
																) : (
																	<span className="text-emerald-600 dark:text-emerald-400">
																		all passed
																	</span>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Summary Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[
					{
						key: "unit",
						label: "Unit",
						value: pyramidData.unit.total,
						config: LAYER_CONFIGS.unit,
						passed: pyramidData.unit.passed,
						failed: pyramidData.unit.failed,
					},
					{
						key: "integration",
						label: "Integration",
						value: pyramidData.integration.total,
						config: LAYER_CONFIGS.integration,
						passed: pyramidData.integration.passed,
						failed: pyramidData.integration.failed,
					},
					{
						key: "e2e",
						label: "E2E",
						value: pyramidData.e2e.total,
						config: LAYER_CONFIGS.e2e,
						passed: pyramidData.e2e.passed,
						failed: pyramidData.e2e.failed,
					},
					{
						key: "visual",
						label: "Visual",
						value: pyramidData.visual.total,
						config: LAYER_CONFIGS.visual,
						passed: 0,
						failed: 0,
					},
				].map((stat) => {
					const hasResults = stat.passed + stat.failed > 0;
					const passRate = hasResults ? (stat.passed / (stat.passed + stat.failed)) * 100 : 0;

					return (
						<Card key={stat.key} className="overflow-hidden">
							<CardContent className="p-5">
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
										{hasResults && (
											<Badge
												variant={passRate >= 90 ? "success" : passRate >= 70 ? "warning" : "error"}
												className="text-xs"
											>
												{passRate.toFixed(0)}%
											</Badge>
										)}
									</div>
									<div className="text-3xl font-bold tabular-nums">
										{stat.value.toLocaleString()}
									</div>
									{hasResults && (
										<div className="space-y-1.5">
											<div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
												<div
													className={`h-full ${stat.config.color.accent} transition-all duration-500`}
													style={{ width: `${passRate}%` }}
												/>
											</div>
											<div className="flex justify-between text-xs text-muted-foreground">
												<span>{stat.passed} passed</span>
												{stat.failed > 0 && (
													<span className="text-destructive">{stat.failed} failed</span>
												)}
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
