// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type Anomaly = Doc<"anomalies">;

export default function Anomalies() {
	const anomalies = useQuery(api.anomalies.getAnomalies, { resolved: false });
	const resolveAnomaly = useMutation(api.anomalies.resolveAnomaly);

	const handleResolve = async (anomalyId: string) => {
		await resolveAnomaly({ anomalyId: anomalyId as Anomaly["_id"] });
	};

	const groupedAnomalies = {
		flaky: anomalies?.filter((a: Anomaly) => a.type === "flaky") || [],
		slow: anomalies?.filter((a: Anomaly) => a.type === "slow") || [],
		frequently_failing: anomalies?.filter((a: Anomaly) => a.type === "frequently_failing") || [],
		resource_intensive: anomalies?.filter((a: Anomaly) => a.type === "resource_intensive") || [],
	};

	const getSeverityVariant = (severity: string): "error" | "warning" | "info" | "neutral" => {
		switch (severity) {
			case "high":
				return "error";
			case "medium":
				return "warning";
			case "low":
				return "info";
			default:
				return "neutral";
		}
	};

	return (
		<div className="space-y-8">
			<PageHeader title="Anomaly Detection" description="Detected issues in your test suite" />

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle>Flaky Tests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.flaky.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Slow Tests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.slow.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Frequently Failing</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.frequently_failing.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Resource Intensive</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{groupedAnomalies.resource_intensive.length}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Anomalies</CardTitle>
					<CardDescription>
						{anomalies?.length || 0} unresolved anomaly
						{anomalies?.length !== 1 ? "ies" : ""}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{anomalies && anomalies.length > 0 ? (
						<div className="space-y-2">
							{anomalies.map((anomaly: Anomaly) => (
								<div
									key={anomaly._id}
									className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
								>
									<div className="flex-1 flex items-center gap-2 flex-wrap">
										<div className="font-medium">{anomaly.testName}</div>
										<Badge variant={getSeverityVariant(anomaly.severity)}>{anomaly.severity}</Badge>
										<Badge variant="neutral">{anomaly.type.replace("_", " ")}</Badge>
										{anomaly.details && (
											<span className="text-xs text-muted-foreground">
												{anomaly.type === "slow" &&
													typeof anomaly.details.averageDuration === "number" &&
													`Avg: ${(anomaly.details.averageDuration / 1000).toFixed(2)}s`}
												{anomaly.type === "flaky" &&
													typeof anomaly.details.passRate === "number" &&
													` Pass: ${(anomaly.details.passRate * 100).toFixed(1)}%`}
												{anomaly.type === "frequently_failing" &&
													typeof anomaly.details.failureRate === "number" &&
													` Fail: ${(anomaly.details.failureRate * 100).toFixed(1)}%`}
											</span>
										)}
									</div>
									<Button variant="outline" size="sm" onClick={() => handleResolve(anomaly._id)}>
										Resolve
									</Button>
								</div>
							))}
						</div>
					) : (
						<EmptyState
							title="No anomalies detected"
							description="Your test suite looks healthy. Anomalies will appear here when flaky, slow, or frequently failing tests are detected."
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
