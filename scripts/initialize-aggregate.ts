#!/usr/bin/env bun
/**
 * Script to initialize the test definition aggregate with existing data
 * Run with: bun scripts/initialize-aggregate.ts
 */

import { ConvexHttpClient } from "convex/browser";

// Get Convex URL from environment or use default
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "http://localhost:3000";

async function main() {
	console.log("🚀 Initializing test definition aggregate...");
	console.log(`📡 Connecting to Convex at: ${CONVEX_URL}`);

	const client = new ConvexHttpClient(CONVEX_URL);

	try {
		const result = await client.mutation("tests:initializeTestDefinitionAggregate", {});

		console.log("✅ Successfully initialized aggregate!");
		console.log(`   Total definitions inserted: ${result.totalInserted}`);
	} catch (error) {
		console.error("❌ Error initializing aggregate:", error);
		process.exit(1);
	}
}

main();
