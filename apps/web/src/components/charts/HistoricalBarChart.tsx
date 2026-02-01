import { chartColors } from "@/lib/chartUtils";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";

interface HistoricalBarChartProps {
	data: Array<{ label: string; date?: number; passed: number; failed: number; skipped?: number }>;
	stacked?: boolean;
	height?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
	if (!active || !payload || payload.length === 0) return null;

	const dataPoint = payload[0].payload;
	const total = dataPoint.passed + dataPoint.failed + (dataPoint.skipped || 0);
	const passRate = total > 0 ? ((dataPoint.passed / total) * 100).toFixed(1) : "0";

	return (
		<div className="rounded-lg border border-border bg-card p-3 shadow-lg">
			<p className="text-sm font-medium text-foreground">{label}</p>
			{dataPoint.date && (
				<p className="text-xs text-muted-foreground mb-2">
					{new Date(dataPoint.date).toLocaleString()}
				</p>
			)}
			<div className="space-y-1">
				<p className="text-sm">
					<span className="text-muted-foreground">Passed:</span>{" "}
					<span className="font-medium" style={{ color: chartColors.success }}>
						{dataPoint.passed}
					</span>
				</p>
				{dataPoint.failed > 0 && (
					<p className="text-sm">
						<span className="text-muted-foreground">Failed:</span>{" "}
						<span className="font-medium" style={{ color: chartColors.error }}>
							{dataPoint.failed}
						</span>
					</p>
				)}
				{dataPoint.skipped > 0 && (
					<p className="text-sm">
						<span className="text-muted-foreground">Skipped:</span>{" "}
						<span className="font-medium" style={{ color: chartColors.neutral }}>
							{dataPoint.skipped}
						</span>
					</p>
				)}
				<p className="text-sm pt-1 border-t border-border">
					<span className="text-muted-foreground">Total:</span>{" "}
					<span className="font-medium text-foreground">{total}</span>
					{" • "}
					<span className="text-muted-foreground">Pass Rate:</span>{" "}
					<span className="font-medium text-foreground">{passRate}%</span>
				</p>
			</div>
		</div>
	);
}

export function HistoricalBarChart({
	data,
	stacked = true,
	height = 300,
}: HistoricalBarChartProps) {
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

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
				<XAxis
					dataKey="label"
					stroke={chartColors.muted}
					style={{ fontSize: "12px" }}
					angle={-45}
					textAnchor="end"
					height={60}
				/>
				<YAxis stroke={chartColors.muted} style={{ fontSize: "12px" }} />
				<Tooltip content={<CustomTooltip />} />
				{stacked ? (
					<>
						<Bar dataKey="passed" stackId="a" fill={chartColors.success} name="Passed" />
						<Bar dataKey="failed" stackId="a" fill={chartColors.error} name="Failed" />
						{data.some((d) => d.skipped && d.skipped > 0) && (
							<Bar dataKey="skipped" stackId="a" fill={chartColors.neutral} name="Skipped" />
						)}
					</>
				) : (
					<>
						<Bar dataKey="passed" fill={chartColors.success} name="Passed" />
						<Bar dataKey="failed" fill={chartColors.error} name="Failed" />
						{data.some((d) => d.skipped && d.skipped > 0) && (
							<Bar dataKey="skipped" fill={chartColors.neutral} name="Skipped" />
						)}
					</>
				)}
				<Legend
					wrapperStyle={{ paddingTop: "20px" }}
					iconType="square"
					formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
