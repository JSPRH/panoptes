import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import projectsModule from "./modules/projects";
import testsModule from "./modules/tests";

const app = new Elysia()
	.use(cors())
	.use(
		swagger({
			documentation: {
				info: {
					title: "Panoptes API",
					version: "1.0.0",
					description: "Test visualization platform API",
				},
				tags: [
					{ name: "tests", description: "Test ingestion and querying" },
					{ name: "projects", description: "Project management" },
				],
			},
		}),
	)
	.group("/api/v1", (app) => app.use(testsModule).use(projectsModule))
	.get("/health", () => ({ status: "ok" }))
	.listen(3001);

console.log(`🚀 API server is running at http://localhost:${app.server?.port}`);

export type App = typeof app;
