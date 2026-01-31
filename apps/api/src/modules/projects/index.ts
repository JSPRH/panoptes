import { Elysia, t } from "elysia";

export default new Elysia({ prefix: "/projects" })
	.get(
		"/",
		() => {
			// TODO: Query projects from Convex
			return {
				projects: [],
				total: 0,
			};
		},
		{
			detail: {
				tags: ["projects"],
				summary: "List projects",
				description: "Get all projects",
			},
		},
	)
	.post(
		"/",
		({ body }) => {
			// TODO: Create/update project in Convex
			return {
				success: true,
				projectId: `project-${Date.now()}`,
				...body,
			};
		},
		{
			body: t.Object({
				name: t.String(),
				description: t.Optional(t.String()),
				repository: t.Optional(t.String()),
			}),
			detail: {
				tags: ["projects"],
				summary: "Create or update project",
				description: "Create a new project or update an existing one",
			},
		},
	);
