import { chartColors, formatChartDate, formatChartDateTime } from "@/lib/chartUtils";
import {
	Area,
	AreaChart,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

interface HistoricalLineChartProps {
	data: Array<{ date: number; value: number; label?: string }>;
	yAxisLabel?: string;
	valueFormatter?: (value: number) => string;
	showArea?: boolean;
	height?: number;
	color?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
	if (!active || !payload || payload.length === 0) return null;

	const dataPoint = payload[0];
	const date = typeof label === "number" ? label : dataPoint.payload?.date;
	const value = dataPoint.value as number;
	const formattedValue = dataPoint.payload?.formattedValue ?? String(value);
	const formattedDate = date ? formatChartDateTime(date) : "";

	return (
		<div className="rounded-lg border border-border bg-card p-3 shadow-lg">
			<p className="text-sm font-medium text-foreground">{formattedDate}</p>
			<p className="text-sm text-muted-foreground">
				{dataPoint.name}: <span className="font-medium text-foreground">{formattedValue}</span>
			</p>
		</div>
	);
}

export function HistoricalLineChart({
	data,
	yAxisLabel,
	valueFormatter = (v) => String(v),
	showArea = false,
	height = 300,
	color = chartColors.info,
}: HistoricalLineChartProps) {
	if (data.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-sm text-muted-foreground"
				style={{ height }}
			>
				No data available
			</div>
		);
	}

	// Prepare data with formatted values for tooltip
	const chartData = data.map((point) => ({
		...point,
		formattedValue: valueFormatter(point.value),
	}));

	return (
		<ResponsiveContainer width="100%" height={height}>
			{showArea ? (
				<AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
					<XAxis
						dataKey="date"
						tickFormatter={formatChartDate}
						stroke={chartColors.muted}
						style={{ fontSize: "12px" }}
					/>
					<YAxis
						tickFormatter={valueFormatter}
						stroke={chartColors.muted}
						style={{ fontSize: "12px" }}
						label={
							yAxisLabel
								? {
										value: yAxisLabel,
										angle: -90,
										position: "insideLeft",
										style: { textAnchor: "middle", fill: chartColors.muted },
									}
								: undefined
						}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						fill={color}
						fillOpacity={0.2}
						strokeWidth={2}
						dot={{ r: 3, fill: color }}
						activeDot={{ r: 5, fill: color }}
					/>
				</AreaChart>
			) : (
				<LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
					<XAxis
						dataKey="date"
						tickFormatter={formatChartDate}
						stroke={chartColors.muted}
						style={{ fontSize: "12px" }}
					/>
					<YAxis
						tickFormatter={valueFormatter}
						stroke={chartColors.muted}
						style={{ fontSize: "12px" }}
						label={
							yAxisLabel
								? {
										value: yAxisLabel,
										angle: -90,
										position: "insideLeft",
										style: { textAnchor: "middle", fill: chartColors.muted },
									}
								: undefined
						}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Line
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={2}
						dot={{ r: 3, fill: color }}
						activeDot={{ r: 5, fill: color }}
					/>
				</LineChart>
			)}
		</ResponsiveContainer>
	);
}
