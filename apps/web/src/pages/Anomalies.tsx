// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case "high":
				return "bg-red-100 text-red-800 border-red-300";
			case "medium":
				return "bg-yellow-100 text-yellow-800 border-yellow-300";
			case "low":
				return "bg-blue-100 text-blue-800 border-blue-300";
			default:
				return "bg-gray-100 text-gray-800 border-gray-300";
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Anomaly Detection</h1>
				<p className="text-muted-foreground">Detected issues in your test suite</p>
			</div>

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
						<div className="space-y-4">
							{anomalies.map((anomaly: Anomaly) => (
								<div
									key={anomaly._id}
									className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex-1">
											<div className="font-medium">{anomaly.testName}</div>
											<div className="text-sm opacity-80 mt-1">
												Type: {anomaly.type.replace("_", " ")} • Severity: {anomaly.severity}
											</div>
											{anomaly.details && (
												<div className="text-xs mt-2 opacity-70">
													{anomaly.type === "slow" && anomaly.details.averageDuration && (
														<div>
															Average Duration:{" "}
															{(anomaly.details.averageDuration / 1000).toFixed(2)}s
														</div>
													)}
													{anomaly.type === "flaky" && anomaly.details.passRate && (
														<div>Pass Rate: {(anomaly.details.passRate * 100).toFixed(1)}%</div>
													)}
													{anomaly.type === "frequently_failing" && anomaly.details.failureRate && (
														<div>
															Failure Rate: {(anomaly.details.failureRate * 100).toFixed(1)}%
														</div>
													)}
												</div>
											)}
										</div>
										<button
											type="button"
											onClick={() => handleResolve(anomaly._id)}
											className="px-4 py-2 bg-white rounded-md text-sm font-medium hover:bg-gray-50"
										>
											Resolve
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No anomalies detected. Your test suite looks healthy!
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
