/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";
const dirname =
	typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@convex": path.resolve(__dirname, "../../convex"),
		},
		extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
	},
	server: {
		port: 5173,
		fs: {
			// Allow serving files from the project root
			allow: [".."],
		},
	},
	optimizeDeps: {
		exclude: ["convex"],
	},
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, ".storybook"),
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						// Configure Playwright provider
						// Note: playwright.config.ts is used by @storybook/test-runner, not by vitest browser mode
						provider: playwright({
							// Basic playwright options for vitest browser mode
							// The full playwright config with reporter is used by test-runner separately
						}),
						instances: [
							{
								browser: "chromium",
							},
						],
					},
					setupFiles: [".storybook/vitest.setup.ts"],
				},
			},
		],
	},
});
