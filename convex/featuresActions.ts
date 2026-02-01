"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { getCursorApiKey, normalizeRepositoryUrl, resolveRepositoryRef } from "./aiAnalysisUtils";

/**
 * Trigger a Cursor Cloud Agent to enhance test coverage for a feature.
 * This calls the Cursor Cloud Agents API to launch an agent.
 * See: https://cursor.com/docs/cloud-agent/api/endpoints
 */
export const triggerCloudAgentForFeature = action({
	args: {
		featureId: v.id("features"),
	},
	handler: async (ctx, args) => {
		// Get feature with tests
		const featureWithTests = await ctx.runQuery(api.features.getFeatureWithTests, {
			featureId: args.featureId,
		});

		if (!featureWithTests) {
			throw new Error("Feature not found");
		}

		const feature = featureWithTests.feature;
		const tests = featureWithTests.tests;

		// Get project for repository info
		const project = await ctx
			.runQuery(api.tests.getProjects)
			.then((projects) => projects.find((p: Doc<"projects">) => p._id === feature.projectId));

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
		}

		// Get latest test run for branch/commit info
		const latestTestRun = await ctx.runQuery(api.tests.getTestRuns, {
			projectId: feature.projectId,
			limit: 1,
		});

		const relatedFilesList = feature.relatedFiles.slice(0, 10).join(", ");
		const moreFiles =
			feature.relatedFiles.length > 10 ? ` (+${feature.relatedFiles.length - 10} more)` : "";

		const totalTests = tests.length;
		const passedTests = tests.filter((t) => t.testStatus === "passed").length;
		const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
		const confirmedMappings = tests.filter((t) => t.mapping.isUserConfirmed).length;

		// Build prompt for enhancing test coverage
		const prompt = `Enhance test coverage for feature: ${feature.name}

Feature Description: ${feature.description}
${feature.category ? `Category: ${feature.category}` : ""}
${feature.userJourney ? `User Journey: ${feature.userJourney}` : ""}

Related Files:
${relatedFilesList}${moreFiles}

Current Test Coverage:
- Total Tests: ${totalTests}
- Pass Rate: ${passRate.toFixed(1)}%
- Confirmed Mappings: ${confirmedMappings}

Please analyze the related files and suggest additional tests to improve coverage for this feature. Focus on:
1. Edge cases not currently tested
2. Integration scenarios
3. Error handling paths
4. User journey coverage
5. Boundary conditions and validation

Generate comprehensive test cases that would increase confidence in this feature's reliability. Add tests that cover the uncovered aspects of this feature.`;

		const apiKey = getCursorApiKey();

		// Determine branch/ref to use
		let ref = "main";
		if (latestTestRun && latestTestRun.length > 0) {
			const testRun = latestTestRun[0];
			if (testRun.ciRunId) {
				const ciRun = await ctx.runQuery(api.github.getCIRun, {
					runId: testRun.ciRunId,
				});
				if (ciRun?.branch) {
					ref = ciRun.branch;
				}
			} else if (testRun.commitSha) {
				ref = testRun.commitSha;
			}
		}

		// Normalize repository URL to full GitHub URL format required by Cursor API
		const repository = normalizeRepositoryUrl(project.repository);

		// Resolve the ref: verify branch exists, fallback to default branch
		const resolvedRef = await resolveRepositoryRef(repository, ref, undefined);

		// Call Cursor Cloud Agents API
		// See: https://cursor.com/docs/cloud-agent/api/endpoints#launch-an-agent
		const response = await fetch("https://api.cursor.com/v0/agents", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
			},
			body: JSON.stringify({
				prompt: {
					text: prompt,
				},
				source: {
					repository,
					ref: resolvedRef,
				},
				target: {
					autoCreatePr: true,
					openAsCursorGithubApp: false,
					skipReviewerRequest: false,
				},
				model: "composer-1",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Cursor Cloud Agents API error: ${response.status} - ${errorText}`);
		}

		const result = (await response.json()) as {
			id: string;
			name: string;
			status: string;
			target?: {
				url?: string;
				prUrl?: string;
			};
		};

		// Construct agent URL with agent ID
		const agentUrl = result.target?.url || `https://cursor.com/agents?id=${result.id}`;

		return {
			agentId: result.id,
			agentUrl,
			prUrl: result.target?.prUrl,
		};
	},
});
