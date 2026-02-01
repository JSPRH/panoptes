import { chartColors } from "@/lib/chartUtils";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipProps } from "recharts";

interface SparklineChartProps {
	data: number[];
	trend?: "up" | "down" | "stable";
	width?: number;
	height?: number;
	color?: string;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
	if (!active || !payload || payload.length === 0) return null;

	const value = payload[0].value as number;

	return (
		<div className="rounded-lg border border-border bg-card p-2 shadow-lg">
			<p className="text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

export function SparklineChart({
	data,
	trend,
	width = 100,
	height = 30,
	color,
}: SparklineChartProps) {
	if (data.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-xs text-muted-foreground"
				style={{ width, height }}
			>
				—
			</div>
		);
	}

	// Determine color based on trend if not provided
	let chartColor = color || chartColors.info;
	if (!color && trend) {
		switch (trend) {
			case "up":
				chartColor = chartColors.success;
				break;
			case "down":
				chartColor = chartColors.error;
				break;
			case "stable":
				chartColor = chartColors.neutral;
				break;
		}
	}

	const chartData = data.map((value, index) => ({ index, value }));

	return (
		<ResponsiveContainer width={width} height={height}>
			<LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
				<Line
					type="monotone"
					dataKey="value"
					stroke={chartColor}
					strokeWidth={1.5}
					dot={false}
					activeDot={{ r: 3, fill: chartColor }}
				/>
				<Tooltip content={<CustomTooltip />} />
			</LineChart>
		</ResponsiveContainer>
	);
}
