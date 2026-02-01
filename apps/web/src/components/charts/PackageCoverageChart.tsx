import {
	chartColors,
	formatChartDate,
	formatChartDateTime,
	formatPercentage,
} from "@/lib/chartUtils";
import type { TooltipProps } from "recharts";
import {
	Area,
	AreaChart,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface PackageCoverageChartProps {
	data: Array<{
		date: number;
		packages: Record<
			string,
			{
				coverage: number;
				linesCovered: number;
				linesTotal: number;
				fileCount: number;
			}
		>;
	}>;
	showArea?: boolean;
	height?: number;
	maxPackages?: number;
}

// Generate distinct colors for packages
const packageColors = [
	chartColors.info,
	chartColors.success,
	chartColors.warning,
	chartColors.error,
	"hsl(280, 70%, 50%)", // Purple
	"hsl(200, 70%, 50%)", // Cyan
	"hsl(30, 70%, 50%)", // Orange
	"hsl(150, 70%, 50%)", // Teal
	"hsl(320, 70%, 50%)", // Pink
	"hsl(60, 70%, 50%)", // Yellow
];

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
					const dataKey = entry.dataKey as string;
					// Extract package name from dataKey (format: "packageName_coverage")
					const packageName = dataKey.replace("_coverage", "");
					return (
						<p key={entry.dataKey} className="text-sm">
							<span
								className="inline-block w-3 h-3 rounded mr-2"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="text-muted-foreground">{packageName}:</span>{" "}
							<span className="font-medium text-foreground">{formatPercentage(value)}</span>
						</p>
					);
				})}
			</div>
		</div>
	);
}

export function PackageCoverageChart({
	data,
	showArea = false,
	height = 300,
	maxPackages = 10,
}: PackageCoverageChartProps) {
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

	// Collect all unique package names across all data points
	const allPackages = new Set<string>();
	for (const point of data) {
		for (const pkg of Object.keys(point.packages)) {
			allPackages.add(pkg);
		}
	}

	// Transform data for Recharts: flatten packages into separate dataKeys
	const chartData = data.map((point) => {
		const result: Record<string, number | string> = {
			date: point.date,
		};
		for (const [pkg, pkgData] of Object.entries(point.packages)) {
			result[`${pkg}_coverage`] = pkgData.coverage;
		}
		return result;
	});

	// Get package names (sorted for consistent ordering)
	const packageNames = Array.from(allPackages).sort().slice(0, maxPackages);

	const commonProps = {
		margin: { top: 5, right: 10, left: 0, bottom: 5 },
		data: chartData,
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
					{packageNames.map((pkg, index) => (
						<Area
							key={pkg}
							type="monotone"
							dataKey={`${pkg}_coverage`}
							name={pkg}
							stroke={packageColors[index % packageColors.length]}
							fill={packageColors[index % packageColors.length]}
							fillOpacity={0.2}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
						/>
					))}
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
					{packageNames.map((pkg, index) => (
						<Line
							key={pkg}
							type="monotone"
							dataKey={`${pkg}_coverage`}
							name={pkg}
							stroke={packageColors[index % packageColors.length]}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 5 }}
						/>
					))}
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
