// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel";
import { useAction } from "convex/react";

interface UseGitHubSyncOptions {
	projectId: Id<"projects"> | null;
	onRepositoryNotConfigured?: () => void;
}

export function useGitHubSync({ projectId, onRepositoryNotConfigured }: UseGitHubSyncOptions) {
	const syncGitHubData = useAction(api.github.syncProjectGitHubData);

	const handleSync = async () => {
		if (!projectId) return;
		try {
			const result = await syncGitHubData({ projectId });
			let message = "";
			if (result.partialSuccess && result.warnings) {
				message = `Partially synced: ${result.ciRunsCount || 0} CI runs, ${result.prsCount || 0} PRs.\n\nWarnings:\n${result.warnings.join("\n")}`;
			} else {
				message = `GitHub data synced successfully! Stored ${result.ciRunsCount || 0} CI runs and ${result.prsCount || 0} PRs.`;
			}
			alert(message);
		} catch (error) {
			console.error("Failed to sync GitHub data:", error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes("repository not configured")) {
				onRepositoryNotConfigured?.();
			}
			alert(`Failed to sync: ${errorMessage}`);
		}
	};

	return { handleSync };
}
