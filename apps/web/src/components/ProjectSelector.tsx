// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Project = Doc<"projects">;

interface ProjectSelectorProps {
	selectedProjectId: Id<"projects"> | null;
	onProjectSelect: (projectId: Id<"projects">) => void;
	description?: string;
}

export function ProjectSelector({
	selectedProjectId,
	onProjectSelect,
	description = "Select a project",
}: ProjectSelectorProps) {
	const projects = useQuery(api.tests.getProjects);

	if (!projects || projects.length === 0) {
		return <p className="text-muted-foreground">No projects found. Create a project first.</p>;
	}

	if (projects.length === 1) {
		return null; // Don't show selector if only one project
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Project Selection</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2">
					{projects.map((project: Project) => (
						<Button
							key={project._id}
							variant={selectedProjectId === project._id ? "default" : "outline"}
							size="sm"
							onClick={() => onProjectSelect(project._id as Id<"projects">)}
						>
							{project.name}
							{!project.repository && <span className="ml-2 text-xs text-warning">(no repo)</span>}
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
