#!/usr/bin/env node

import { TestRunIngest } from "@panoptes/shared";
import { Command } from "commander";
import { readFile } from "fs/promises";

const program = new Command();

program
	.name("panoptes")
	.description("CLI tool for Panoptes test visualization platform")
	.version("0.1.0");

program
	.command("ingest")
	.description("Ingest test results from a JSON file")
	.requiredOption("-f, --file <path>", "Path to test results JSON file")
	.option(
		"-a, --api-url <url>",
		"API URL",
		process.env.PANOPTES_API_URL || "http://localhost:3001",
	)
	.option(
		"-p, --project <name>",
		"Project name",
		process.env.PANOPTES_PROJECT_NAME || "default-project",
	)
	.action(async (options) => {
		try {
			const fileContent = await readFile(options.file, "utf-8");
			const testData = JSON.parse(fileContent) as TestRunIngest;

			// Ensure required fields
			testData.projectName = options.project;
			testData.startedAt = testData.startedAt || Date.now();
			testData.completedAt = testData.completedAt || Date.now();

			const response = await fetch(`${options.apiUrl}/api/v1/tests/ingest`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(testData),
			});

			if (!response.ok) {
				const error = await response.text();
				console.error(`Error: ${error}`);
				process.exit(1);
			}

			const result = await response.json();
			console.log(`✅ Test results ingested successfully!`);
			console.log(`   Test Run ID: ${result.testRunId}`);
		} catch (error) {
			console.error(
				"Error:",
				error instanceof Error ? error.message : "Unknown error",
			);
			process.exit(1);
		}
	});

program.parse();
