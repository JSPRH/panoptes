import type { TestRunIngest } from "./model";

export abstract class TestService {
	/**
	 * Process and validate test run data
	 * This will be implemented to call Convex mutations
	 */
	abstract ingestTestRun(
		data: TestRunIngest
	): Promise<{ success: boolean; testRunId?: string; error?: string }>;
}

// Implementation that calls Convex via HTTP action
// In production, this would use Convex HTTP actions or direct Convex client
export class TestServiceImpl extends TestService {
	private convexUrl: string;

	constructor(convexUrl?: string) {
		super();
		this.convexUrl = convexUrl || process.env.CONVEX_URL || "";
	}

	async ingestTestRun(
		data: TestRunIngest
	): Promise<{ success: boolean; testRunId?: string; error?: string }> {
		if (!this.convexUrl) {
			// Fallback: return success but log warning
			console.warn("CONVEX_URL not set, test data not persisted");
			return {
				success: true,
				testRunId: `test-run-${Date.now()}`,
			};
		}

		try {
			// Call Convex HTTP action
			// The HTTP action endpoint format is: {convexUrl}/http/{routePath}
			const response = await fetch(`${this.convexUrl}/http/ingestTestRunHttp`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: error || "Failed to ingest test run",
				};
			}

			const result = (await response.json()) as { testRunId?: string };
			return {
				success: true,
				testRunId: result.testRunId,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}
