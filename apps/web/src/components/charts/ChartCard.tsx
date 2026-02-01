import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type PeriodOption, periodOptions } from "@/lib/chartUtils";

interface ChartCardProps {
	title: string;
	description?: string;
	periodOptions?: readonly PeriodOption[];
	selectedPeriod?: string;
	onPeriodChange?: (period: string) => void;
	children: React.ReactNode;
}

export function ChartCard({
	title,
	description,
	periodOptions: customPeriodOptions,
	selectedPeriod,
	onPeriodChange,
	children,
}: ChartCardProps) {
	const periods = customPeriodOptions || periodOptions;
	const showPeriodSelector = selectedPeriod !== undefined && onPeriodChange !== undefined;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>{title}</CardTitle>
						{description && <CardDescription>{description}</CardDescription>}
					</div>
					{showPeriodSelector && (
						<select
							value={selectedPeriod}
							onChange={(e) => onPeriodChange(e.target.value)}
							className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							{periods.map((period) => (
								<option key={period.value} value={period.value}>
									{period.label}
								</option>
							))}
						</select>
					)}
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
