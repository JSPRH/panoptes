import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Legend,
	Area,
	AreaChart,
} from "recharts";
import {
	formatChartDate,
	formatChartDateTime,
	formatPercentage,
	chartColors,
} from "@/lib/chartUtils";
import type { TooltipProps } from "recharts";

interface CoverageTrendChartProps {
	data: Array<{
		date: number;
		linesCoverage: number;
		statementsCoverage: number;
		branchesCoverage: number;
		functionsCoverage: number;
		overallCoverage: number;
	}>;
	showArea?: boolean;
	height?: number;
	showAllMetrics?: boolean;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
	if (!active || !payload || payload.length === 0) return null;

	const date = typeof label === "number" ? label : payload[0].payload?.date;
	const formattedDate = date ? formatChartDateTime(date) : "";

	return (
		<div className="rounded-lg border border-border bg-card p-3 shadow-lg">
			<p className="text-sm font-medium text-foreground mb-2">{formattedDate}</p>
			<div className="space-y-1">
				{payload.map((entry) => {
					const value = entry.value as number;
					return (
						<p key={entry.dataKey} className="text-sm">
							<span
								className="inline-block w-3 h-3 rounded mr-2"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="text-muted-foreground">{entry.name}:</span>{" "}
							<span className="font-medium text-foreground">{formatPercentage(value)}</span>
						</p>
					);
				})}
			</div>
		</div>
	);
}

export function CoverageTrendChart({
	data,
	showArea = false,
	height = 300,
	showAllMetrics = false,
}: CoverageTrendChartProps) {
	if (data.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-sm text-muted-foreground"
				style={{ height }}
			>
				No coverage data available
			</div>
		);
	}

	const commonProps = {
		margin: { top: 5, right: 10, left: 0, bottom: 5 },
		data,
	};

	const axisProps = {
		XAxis: {
			dataKey: "date" as const,
			tickFormatter: formatChartDate,
			stroke: chartColors.muted,
			style: { fontSize: "12px" },
		},
		YAxis: {
			tickFormatter: formatPercentage,
			stroke: chartColors.muted,
			style: { fontSize: "12px" },
			domain: [0, 100] as [number, number],
			label: {
				value: "Coverage (%)",
				angle: -90,
				position: "insideLeft" as const,
				style: { textAnchor: "middle", fill: chartColors.muted },
			},
		},
	};

	return (
		<ResponsiveContainer width="100%" height={height}>
			{showArea ? (
				<AreaChart {...commonProps}>
					<XAxis {...axisProps.XAxis} />
					<YAxis {...axisProps.YAxis} />
					<Tooltip content={<CustomTooltip />} />
					{showAllMetrics ? (
						<>
							<Area
								type="monotone"
								dataKey="linesCoverage"
								name="Lines"
								stroke={chartColors.info}
								fill={chartColors.info}
								fillOpacity={0.2}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Area
								type="monotone"
								dataKey="statementsCoverage"
								name="Statements"
								stroke={chartColors.success}
								fill={chartColors.success}
								fillOpacity={0.2}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Area
								type="monotone"
								dataKey="branchesCoverage"
								name="Branches"
								stroke={chartColors.warning}
								fill={chartColors.warning}
								fillOpacity={0.2}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Area
								type="monotone"
								dataKey="functionsCoverage"
								name="Functions"
								stroke={chartColors.error}
								fill={chartColors.error}
								fillOpacity={0.2}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
						</>
					) : (
						<Area
							type="monotone"
							dataKey="overallCoverage"
							name="Overall Coverage"
							stroke={chartColors.success}
							fill={chartColors.success}
							fillOpacity={0.2}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
						/>
					)}
					<Legend
						wrapperStyle={{ paddingTop: "20px" }}
						iconType="line"
						formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
					/>
				</AreaChart>
			) : (
				<LineChart {...commonProps}>
					<XAxis {...axisProps.XAxis} />
					<YAxis {...axisProps.YAxis} />
					<Tooltip content={<CustomTooltip />} />
					{showAllMetrics ? (
						<>
							<Line
								type="monotone"
								dataKey="linesCoverage"
								name="Lines"
								stroke={chartColors.info}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Line
								type="monotone"
								dataKey="statementsCoverage"
								name="Statements"
								stroke={chartColors.success}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Line
								type="monotone"
								dataKey="branchesCoverage"
								name="Branches"
								stroke={chartColors.warning}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
							<Line
								type="monotone"
								dataKey="functionsCoverage"
								name="Functions"
								stroke={chartColors.error}
								strokeWidth={2}
								dot={{ r: 3 }}
								activeDot={{ r: 5 }}
							/>
						</>
					) : (
						<Line
							type="monotone"
							dataKey="overallCoverage"
							name="Overall Coverage"
							stroke={chartColors.success}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
						/>
					)}
					<Legend
						wrapperStyle={{ paddingTop: "20px" }}
						iconType="line"
						formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
					/>
				</LineChart>
			)}
		</ResponsiveContainer>
	);
}
