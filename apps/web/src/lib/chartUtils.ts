/**
 * Chart utilities for formatting and styling historical visualizations
 */

/**
 * Format a timestamp to a short date string
 */
export function formatChartDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

/**
 * Format a timestamp to a date/time string for tooltips
 */
export function formatChartDateTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Format a duration in milliseconds to a readable string
 */
export function formatDuration(ms: number | undefined): string {
	if (ms == null) return "—";
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60000);
	const seconds = ((ms % 60000) / 1000).toFixed(0);
	return `${minutes}m ${seconds}s`;
}

/**
 * Calculate pass rate from passed and total counts
 */
export function calculatePassRate(passed: number, total: number): number {
	if (total === 0) return 0;
	return (passed / total) * 100;
}

/**
 * Chart color palette matching Badge variants
 * These use CSS variables that adapt to light/dark mode
 */
export const chartColors = {
	success: "hsl(var(--success))",
	error: "hsl(var(--destructive))",
	warning: "hsl(var(--warning))",
	neutral: "hsl(var(--muted-foreground))",
	info: "hsl(var(--primary))",
	background: "hsl(var(--background))",
	card: "hsl(var(--card))",
	border: "hsl(var(--border))",
	muted: "hsl(var(--muted))",
} as const;

/**
 * Get color for a test status
 */
export function getStatusColor(status: "passed" | "failed" | "skipped" | "running"): string {
	switch (status) {
		case "passed":
			return chartColors.success;
		case "failed":
			return chartColors.error;
		case "skipped":
			return chartColors.neutral;
		case "running":
			return chartColors.info;
	}
}

/**
 * Get color for a CI conclusion
 */
export function getCIConclusionColor(
	conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | null
): string {
	switch (conclusion) {
		case "success":
			return chartColors.success;
		case "failure":
			return chartColors.error;
		case "cancelled":
		case "skipped":
		case "neutral":
			return chartColors.neutral;
		case "timed_out":
			return chartColors.warning;
		default:
			return chartColors.info;
	}
}

/**
 * Period options for time range selection
 */
export const periodOptions = [
	{ label: "7 days", value: "7d" },
	{ label: "30 days", value: "30d" },
	{ label: "90 days", value: "90d" },
	{ label: "All time", value: "all" },
] as const;

export type PeriodOption = (typeof periodOptions)[number];

/**
 * Get milliseconds for a period string
 */
export function getPeriodMs(period: string): number | null {
	switch (period) {
		case "7d":
			return 7 * 24 * 60 * 60 * 1000;
		case "30d":
			return 30 * 24 * 60 * 60 * 1000;
		case "90d":
			return 90 * 24 * 60 * 60 * 1000;
		case "all":
			return null; // No limit
		default:
			return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
	}
}

/**
 * Get start timestamp for a period
 */
export function getPeriodStartTimestamp(period: string): number | null {
	const periodMs = getPeriodMs(period);
	if (periodMs === null) return null;
	return Date.now() - periodMs;
}

/**
 * Group data points by time buckets for aggregation
 */
export function groupByTimeBucket<T extends { date: number }>(
	data: T[],
	bucketSizeMs: number
): Array<{ start: number; end: number; items: T[] }> {
	if (data.length === 0) return [];

	const sorted = [...data].sort((a, b) => a.date - b.date);
	const buckets: Array<{ start: number; end: number; items: T[] }> = [];

	let currentBucket: { start: number; end: number; items: T[] } | null = null;

	for (const item of sorted) {
		const bucketStart = Math.floor(item.date / bucketSizeMs) * bucketSizeMs;
		const bucketEnd = bucketStart + bucketSizeMs;

		if (!currentBucket || currentBucket.end !== bucketStart) {
			if (currentBucket) buckets.push(currentBucket);
			currentBucket = { start: bucketStart, end: bucketEnd, items: [] };
		}

		currentBucket.items.push(item);
	}

	if (currentBucket) buckets.push(currentBucket);

	return buckets;
}
