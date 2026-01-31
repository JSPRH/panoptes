import { defineConfig } from "vitest/config";
import PanoptesReporter from "./packages/reporters/vitest/src/index.ts";

export default defineConfig({
	test: {
		reporters: [
			"default",
			new PanoptesReporter({
				convexUrl: process.env.CONVEX_URL,
				projectName: process.env.PANOPTES_PROJECT_NAME || "panoptes-test",
				environment: process.env.NODE_ENV || "development",
				ci: process.env.CI === "true",
			}),
		],
		coverage: {
			provider: "v8",
			reporter: ["json", "text"],
			reportsDirectory: "./coverage",
			include: ["apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
			exclude: [
				"**/*.test.ts",
				"**/*.test.tsx",
				"**/*.spec.ts",
				"**/*.spec.tsx",
				"**/node_modules/**",
				"**/dist/**",
				"**/.storybook/**",
			],
		},
	},
});
