// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useProjectSelection() {
	const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
	const projects = useQuery(api.tests.getProjects);

	const selectedProject = projects?.find((p) => p._id === selectedProjectId);

	// Auto-select first project if only one exists
	useEffect(() => {
		if (projects && projects.length === 1 && !selectedProjectId) {
			setSelectedProjectId(projects[0]._id);
		}
	}, [projects, selectedProjectId]);

	return {
		selectedProjectId,
		setSelectedProjectId,
		selectedProject,
		projects,
	};
}
