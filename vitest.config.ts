import path from "node:path";
import { defineConfig } from "vitest/config";
import PanoptesReporter from "./packages/reporters/vitest/src/index.ts";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./apps/web/src"),
			"@convex": path.resolve(__dirname, "./convex"),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./apps/web/src/test-setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
		include: ["tests/**/*.test.ts", "apps/web/src/**/*.test.ts", "apps/web/src/**/*.test.tsx"],
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
				"**/test-setup.ts",
			],
			// Generate coverage even when tests fail (if supported)
			// Note: Vitest by default doesn't generate coverage on failure
			// This is a workaround - we'll need to fix failing tests for coverage to be reliable
		},
	},
});
