import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import PanoptesReporter from "./packages/reporters/vitest/src/index";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./apps/web/src"),
			"@convex": path.resolve(__dirname, "./convex"),
			// Ensure React and React DOM are resolved from the same location
			react: path.resolve(__dirname, "./apps/web/node_modules/react"),
			"react-dom": path.resolve(__dirname, "./apps/web/node_modules/react-dom"),
		},
	},
	test: {
		environment: "happy-dom",
		environmentMatchGlobs: [
			// All tests in convex/ will run in edge-runtime
			["convex/**", "edge-runtime"],
		],
		setupFiles: ["./apps/web/src/test-setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/*.spec.ts", "**/*.spec.tsx"],
		include: [
			"tests/**/*.test.ts",
			"apps/web/src/**/*.test.ts",
			"apps/web/src/**/*.test.tsx",
			"convex/**/*.test.ts",
		],
		server: {
			deps: {
				inline: ["convex-test", "react", "react-dom"],
			},
		},
		reporters: [
			"default",
			new PanoptesReporter({
				convexUrl: process.env.CONVEX_URL,
				projectName: process.env.PANOPTES_PROJECT_NAME || "panoptes",
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
