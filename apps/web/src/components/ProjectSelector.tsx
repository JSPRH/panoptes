// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";

type Project = Doc<"projects">;

interface ProjectSelectorProps {
	selectedProjectId: Id<"projects"> | null;
	onProjectSelect: (projectId: Id<"projects">) => void;
}

export function ProjectSelector({ selectedProjectId, onProjectSelect }: ProjectSelectorProps) {
	const projects = useQuery(api.tests.getProjects);

	if (!projects || projects.length === 0) {
		return <p className="text-muted-foreground">No projects found. Create a project first.</p>;
	}

	if (projects.length === 1) {
		return null; // Don't show selector if only one project
	}

	return (
		<div className="flex items-center gap-2">
			<label htmlFor="project-select" className="text-sm font-medium text-muted-foreground">
				Project:
			</label>
			<select
				id="project-select"
				value={selectedProjectId || ""}
				onChange={(e) => {
					if (e.target.value) {
						onProjectSelect(e.target.value as Id<"projects">);
					}
				}}
				className="px-3 py-1.5 text-sm border border-border rounded-md bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
			>
				<option value="">-- Select a project --</option>
				{projects.map((project: Project) => (
					<option key={project._id} value={project._id}>
						{project.name}
						{!project.repository ? " (no repo)" : ""}
					</option>
				))}
			</select>
		</div>
	);
}
