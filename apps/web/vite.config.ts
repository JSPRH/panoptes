import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

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
});
