import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";

interface GitHubWorkflowRun {
	id: number;
	name: string;
	status: "queued" | "in_progress" | "completed" | "waiting";
	conclusion:
		| "success"
		| "failure"
		| "neutral"
		| "cancelled"
		| "skipped"
		| "timed_out"
		| "action_required"
		| null;
	head_sha: string;
	head_branch: string;
	created_at: string;
	updated_at: string;
	html_url: string;
	workflow_id: number;
}

interface GitHubPullRequest {
	number: number;
	title: string;
	state: "open" | "closed";
	user: { login: string };
	head: { ref: string; sha: string };
	base: { ref: string };
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface GitHubFileContent {
	content: string;
	encoding: string;
}

interface GitHubJob {
	id: number;
	name: string;
	status: "queued" | "in_progress" | "completed" | "waiting";
	conclusion: "success" | "failure" | "cancelled" | "skipped" | "neutral" | null;
	started_at: string;
	completed_at: string | null;
	runner_name: string | null;
	workflow_name: string;
	steps: GitHubJobStep[];
}

interface GitHubJobStep {
	name: string;
	status: "queued" | "in_progress" | "completed";
	conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
	number: number;
	started_at: string | null;
	completed_at: string | null;
}

function getGitHubToken(): string {
	const token = process.env.GITHUB_ACCESS_TOKEN;
	if (!token) {
		throw new Error("GITHUB_ACCESS_TOKEN not configured in Convex secrets");
	}
	return token;
}

function parseRepositoryUrl(repository: string): { owner: string; repo: string } | null {
	// Support formats: https://github.com/owner/repo, git@github.com:owner/repo.git, owner/repo
	const patterns = [
		/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/,
		/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
		/^([^\/]+)\/([^\/]+)$/,
	];

	for (const pattern of patterns) {
		const match = repository.match(pattern);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
	}
	return null;
}

// Internal helper queries and mutations
export const _getProject = internalQuery({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.projectId);
	},
});

export const _getExistingCIRun = internalQuery({
	args: { projectId: v.id("projects"), runId: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRuns")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("runId"), args.runId))
			.first();
	},
});

export const _updateCIRun = internalMutation({
	args: {
		runId: v.id("ciRuns"),
		status: v.string(),
		conclusion: v.optional(v.string()),
		commitSha: v.string(),
		branch: v.string(),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		htmlUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const previousRun = await ctx.db.get(args.runId);
		const wasFailed = previousRun?.conclusion === "failure" && previousRun?.status === "completed";

		await ctx.db.patch(args.runId, {
			status: args.status as "queued" | "in_progress" | "completed" | "waiting",
			conclusion: args.conclusion as
				| "success"
				| "failure"
				| "neutral"
				| "cancelled"
				| "skipped"
				| "timed_out"
				| "action_required"
				| undefined,
			commitSha: args.commitSha,
			commitMessage: undefined,
			branch: args.branch,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			htmlUrl: args.htmlUrl,
		});

		// Auto-trigger analysis for failed runs
		const isFailed = args.conclusion === "failure" && args.status === "completed";
		if (isFailed && !wasFailed) {
			// Check if analysis already exists
			const existingAnalysis = await ctx.db
				.query("ciRunAnalysis")
				.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.runId))
				.first();

			// Only schedule if no analysis exists or it's not completed
			if (!existingAnalysis || existingAnalysis.status !== "completed") {
				// Schedule the processing action asynchronously
				await ctx.scheduler.runAfter(0, internal.ciAnalysisActions._processFailedCIRun, {
					ciRunId: args.runId,
				});
			}
		}
	},
});

export const _insertCIRun = internalMutation({
	args: {
		projectId: v.id("projects"),
		workflowId: v.number(),
		workflowName: v.string(),
		runId: v.number(),
		status: v.string(),
		conclusion: v.optional(v.string()),
		commitSha: v.string(),
		branch: v.string(),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		htmlUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const runId = await ctx.db.insert("ciRuns", {
			projectId: args.projectId,
			workflowId: args.workflowId,
			workflowName: args.workflowName,
			runId: args.runId,
			status: args.status as "queued" | "in_progress" | "completed" | "waiting",
			conclusion: args.conclusion as
				| "success"
				| "failure"
				| "neutral"
				| "cancelled"
				| "skipped"
				| "timed_out"
				| "action_required"
				| undefined,
			commitSha: args.commitSha,
			commitMessage: undefined,
			branch: args.branch,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			htmlUrl: args.htmlUrl,
		});

		// Auto-trigger analysis for failed runs
		const isFailed = args.conclusion === "failure" && args.status === "completed";
		if (isFailed) {
			// Schedule the processing action asynchronously
			await ctx.scheduler.runAfter(0, internal.ciAnalysisActions._processFailedCIRun, {
				ciRunId: runId,
			});
		}

		return runId;
	},
});

export const _getExistingPR = internalQuery({
	args: { projectId: v.id("projects"), prNumber: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("pullRequests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.filter((q) => q.eq(q.field("prNumber"), args.prNumber))
			.first();
	},
});

export const _updatePR = internalMutation({
	args: {
		prId: v.id("pullRequests"),
		title: v.string(),
		state: v.string(),
		author: v.string(),
		branch: v.string(),
		baseBranch: v.string(),
		updatedAt: v.number(),
		htmlUrl: v.string(),
		commitSha: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.prId, {
			title: args.title,
			state: (args.state === "open" ? "open" : "closed") as "open" | "closed",
			author: args.author,
			branch: args.branch,
			baseBranch: args.baseBranch,
			updatedAt: args.updatedAt,
			htmlUrl: args.htmlUrl,
			commitSha: args.commitSha,
		});
	},
});

export const _insertPR = internalMutation({
	args: {
		projectId: v.id("projects"),
		prNumber: v.number(),
		title: v.string(),
		state: v.string(),
		author: v.string(),
		branch: v.string(),
		baseBranch: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
		htmlUrl: v.string(),
		commitSha: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("pullRequests", {
			projectId: args.projectId,
			prNumber: args.prNumber,
			title: args.title,
			state: (args.state === "open" ? "open" : "closed") as "open" | "closed",
			author: args.author,
			branch: args.branch,
			baseBranch: args.baseBranch,
			createdAt: args.createdAt,
			updatedAt: args.updatedAt,
			htmlUrl: args.htmlUrl,
			commitSha: args.commitSha,
		});
	},
});

export const getCIRuns = action({
	args: {
		projectId: v.id("projects"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: args.projectId,
		});

		if (!project) {
			throw new Error("Project not found");
		}

		if (!project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();
		const limit = args.limit || 30;

		const response = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs?per_page=${limit}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`GitHub API error: ${response.status} - ${error}`);
		}

		const responseData = (await response.json()) as { workflow_runs?: GitHubWorkflowRun[] };

		// Check if response has workflow_runs or if it's a different structure
		if (!responseData.workflow_runs && !Array.isArray(responseData)) {
			throw new Error(
				`Unexpected GitHub API response structure. Expected 'workflow_runs' array. Got keys: ${Object.keys(responseData).join(", ")}`
			);
		}

		const workflowRuns = responseData.workflow_runs || [];

		// Store CI runs in database
		const storedRuns: Id<"ciRuns">[] = [];
		const errors: string[] = [];

		for (const run of workflowRuns) {
			try {
				// Validate required fields
				if (!run.id || !run.workflow_id || !run.head_sha || !run.head_branch) {
					errors.push(
						`Workflow run ${run.id} missing required fields: ${JSON.stringify({
							id: run.id,
							workflow_id: run.workflow_id,
							head_sha: run.head_sha,
							head_branch: run.head_branch,
						})}`
					);
					continue;
				}

				const existing = await ctx.runQuery(internal.github._getExistingCIRun, {
					projectId: args.projectId,
					runId: run.id,
				});

				if (existing) {
					// Update existing run
					await ctx.runMutation(internal.github._updateCIRun, {
						runId: existing._id,
						status: run.status,
						conclusion: run.conclusion || undefined,
						commitSha: run.head_sha,
						branch: run.head_branch,
						startedAt: new Date(run.created_at).getTime(),
						completedAt:
							run.status === "completed" ? new Date(run.updated_at).getTime() : undefined,
						htmlUrl: run.html_url,
					});
					storedRuns.push(existing._id);
				} else {
					// Insert new run - workflow name might be in workflow object or null
					const workflowName = run.name || `Workflow ${run.workflow_id}`;
					const runId = await ctx.runMutation(internal.github._insertCIRun, {
						projectId: args.projectId,
						workflowId: run.workflow_id,
						workflowName,
						runId: run.id,
						status: run.status,
						conclusion: run.conclusion || undefined,
						commitSha: run.head_sha,
						branch: run.head_branch,
						startedAt: new Date(run.created_at).getTime(),
						completedAt:
							run.status === "completed" ? new Date(run.updated_at).getTime() : undefined,
						htmlUrl: run.html_url,
					});
					storedRuns.push(runId);
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				errors.push(`Failed to store workflow run ${run.id}: ${errorMsg}`);
			}
		}

		if (errors.length > 0 && storedRuns.length === 0) {
			throw new Error(`Failed to store any CI runs. Errors:\n${errors.join("\n")}`);
		}

		// If we have errors but some succeeded, throw with details
		if (errors.length > 0) {
			throw new Error(
				`Stored ${storedRuns.length} runs but encountered errors:\n${errors.join("\n")}`
			);
		}

		return storedRuns;
	},
});

export const getOpenPRs = action({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: args.projectId,
		});

		if (!project) {
			throw new Error("Project not found");
		}

		if (!project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();

		const response = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/pulls?state=open&per_page=100`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`GitHub API error: ${response.status} - ${error}`);
		}

		const prs = (await response.json()) as GitHubPullRequest[];

		if (!Array.isArray(prs)) {
			console.error("GitHub API returned non-array response for PRs:", prs);
			return [];
		}

		// Store/update PRs in database
		const storedPRs: Id<"pullRequests">[] = [];
		for (const pr of prs) {
			try {
				// Validate required fields
				if (!pr.number || !pr.title || !pr.user?.login || !pr.head?.ref || !pr.head?.sha) {
					console.error("Missing required fields in PR:", pr);
					continue;
				}

				const existing = await ctx.runQuery(internal.github._getExistingPR, {
					projectId: args.projectId,
					prNumber: pr.number,
				});

				if (existing) {
					// Update existing PR
					await ctx.runMutation(internal.github._updatePR, {
						prId: existing._id,
						title: pr.title,
						state: pr.state,
						author: pr.user.login,
						branch: pr.head.ref,
						baseBranch: pr.base.ref,
						updatedAt: new Date(pr.updated_at).getTime(),
						htmlUrl: pr.html_url,
						commitSha: pr.head.sha,
					});
					storedPRs.push(existing._id);
				} else {
					// Insert new PR
					const prId = await ctx.runMutation(internal.github._insertPR, {
						projectId: args.projectId,
						prNumber: pr.number,
						title: pr.title,
						state: pr.state,
						author: pr.user.login,
						branch: pr.head.ref,
						baseBranch: pr.base.ref,
						createdAt: new Date(pr.created_at).getTime(),
						updatedAt: new Date(pr.updated_at).getTime(),
						htmlUrl: pr.html_url,
						commitSha: pr.head.sha,
					});
					storedPRs.push(prId);
				}
			} catch (error) {
				console.error(`Failed to store PR ${pr.number}:`, error);
				// Continue with other PRs instead of failing completely
			}
		}

		return storedPRs;
	},
});

export const getCodeSnippet = action({
	args: {
		projectId: v.id("projects"),
		file: v.string(),
		line: v.number(),
		commitSha: v.optional(v.string()),
		contextLines: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: args.projectId,
		});

		if (!project) {
			throw new Error("Project not found");
		}

		if (!project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();
		const contextLines = args.contextLines || 10;
		const ref = args.commitSha || "main";

		// Fetch file content
		// If a specific ref (commit SHA) is provided and doesn't exist, fall back to "main"
		let fileResponse = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeURIComponent(args.file)}?ref=${ref}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		// If we got a 404 and we were using a specific ref (not "main"), try falling back to "main"
		if (
			!fileResponse.ok &&
			fileResponse.status === 404 &&
			args.commitSha &&
			args.commitSha !== "main"
		) {
			fileResponse = await fetch(
				`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeURIComponent(args.file)}?ref=main`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}
			);
		}

		if (!fileResponse.ok) {
			const error = await fileResponse.text();
			throw new Error(`GitHub API error: ${fileResponse.status} - ${error}`);
		}

		const fileData = (await fileResponse.json()) as GitHubFileContent;
		const content = atob(fileData.content);
		const lines = content.split("\n");

		// Extract lines around the target line
		const startLine = Math.max(1, args.line - contextLines);
		const endLine = Math.min(lines.length, args.line + contextLines);
		const snippet = lines.slice(startLine - 1, endLine).join("\n");

		// Detect language from file extension
		const extension = args.file.split(".").pop()?.toLowerCase() || "";
		const languageMap: Record<string, string> = {
			ts: "typescript",
			tsx: "typescript",
			js: "javascript",
			jsx: "javascript",
			py: "python",
			rs: "rust",
			go: "go",
			java: "java",
			cpp: "cpp",
			c: "c",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			swift: "swift",
			kt: "kotlin",
		};
		const language = languageMap[extension] || "text";

		return {
			content: snippet,
			language,
			startLine,
			endLine,
			targetLine: args.line,
		};
	},
});

export const getFileContent = action({
	args: {
		projectId: v.id("projects"),
		file: v.string(),
		ref: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: args.projectId,
		});

		if (!project) {
			throw new Error("Project not found");
		}

		if (!project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();
		const ref = args.ref || "main";

		// Fetch full file content
		// If a specific ref (commit SHA) is provided and doesn't exist, fall back to "main"
		let fileResponse = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeURIComponent(args.file)}?ref=${ref}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		// If we got a 404 and we were using a specific ref (not "main"), try falling back to "main"
		if (!fileResponse.ok && fileResponse.status === 404 && args.ref && args.ref !== "main") {
			fileResponse = await fetch(
				`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeURIComponent(args.file)}?ref=main`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}
			);
		}

		if (!fileResponse.ok) {
			const error = await fileResponse.text();
			throw new Error(`GitHub API error: ${fileResponse.status} - ${error}`);
		}

		const fileData = (await fileResponse.json()) as GitHubFileContent;
		const content = atob(fileData.content);

		// Detect language from file extension
		const extension = args.file.split(".").pop()?.toLowerCase() || "";
		const languageMap: Record<string, string> = {
			ts: "typescript",
			tsx: "typescript",
			js: "javascript",
			jsx: "javascript",
			py: "python",
			rs: "rust",
			go: "go",
			java: "java",
			cpp: "cpp",
			c: "c",
			cs: "csharp",
			php: "php",
			rb: "ruby",
			swift: "swift",
			kt: "kotlin",
			json: "json",
			md: "markdown",
			yaml: "yaml",
			yml: "yaml",
		};
		const language = languageMap[extension] || "text";

		return {
			content,
			language,
			lines: content.split("\n"),
		};
	},
});

export const getAvailableRepositories = action({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const token = getGitHubToken();
		const limit = args.limit || 100;

		// Fetch repositories the authenticated user has access to
		const response = await fetch(
			`https://api.github.com/user/repos?per_page=${limit}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`GitHub API error: ${response.status} - ${error}`);
		}

		const repos = (await response.json()) as Array<{
			id: number;
			full_name: string;
			name: string;
			owner: { login: string };
			html_url: string;
			private: boolean;
			description: string | null;
		}>;

		return repos.map((repo) => ({
			fullName: repo.full_name,
			name: repo.name,
			owner: repo.owner.login,
			url: repo.html_url,
			private: repo.private,
			description: repo.description,
		}));
	},
});

export const syncProjectGitHubData = action({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const errors: string[] = [];
		let ciRunsCount = 0;
		let prsCount = 0;
		let ciRunsError: string | null = null;
		let prsError: string | null = null;

		try {
			const ciRuns = await ctx.runAction(api.github.getCIRuns, { projectId: args.projectId });
			ciRunsCount = Array.isArray(ciRuns) ? ciRuns.length : 0;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			ciRunsError = errorMessage;
			errors.push(`CI Runs: ${errorMessage}`);
		}

		try {
			const prs = await ctx.runAction(api.github.getOpenPRs, { projectId: args.projectId });
			prsCount = Array.isArray(prs) ? prs.length : 0;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			prsError = errorMessage;
			errors.push(`Pull Requests: ${errorMessage}`);
		}

		// If both failed, throw error
		if (ciRunsError && prsError) {
			throw new Error(`Failed to sync both CI runs and PRs:\n${errors.join("\n")}`);
		}

		// If one failed, return partial success with details
		if (errors.length > 0) {
			return {
				success: true,
				ciRunsCount,
				prsCount,
				warnings: errors,
				partialSuccess: true,
			};
		}

		return { success: true, ciRunsCount, prsCount };
	},
});

export const getCIRunsForProject = query({
	args: {
		projectId: v.id("projects"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 50;
		return await ctx.db
			.query("ciRuns")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.order("desc")
			.take(limit);
	},
});

export const getCIRun = query({
	args: {
		runId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.runId);
	},
});

// Internal mutations for CI run jobs and steps
export const _insertCIRunJob = internalMutation({
	args: {
		ciRunId: v.id("ciRuns"),
		jobId: v.number(),
		name: v.string(),
		status: v.string(),
		conclusion: v.optional(v.string()),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		runnerName: v.optional(v.string()),
		workflowName: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("ciRunJobs", {
			ciRunId: args.ciRunId,
			jobId: args.jobId,
			name: args.name,
			status: args.status as "queued" | "in_progress" | "completed" | "waiting",
			conclusion: args.conclusion as
				| "success"
				| "failure"
				| "cancelled"
				| "skipped"
				| "neutral"
				| undefined,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			runnerName: args.runnerName,
			workflowName: args.workflowName,
		});
	},
});

export const _insertCIRunJobStep = internalMutation({
	args: {
		jobId: v.id("ciRunJobs"),
		stepNumber: v.number(),
		name: v.string(),
		status: v.string(),
		conclusion: v.optional(v.string()),
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
		logs: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("ciRunJobSteps", {
			jobId: args.jobId,
			stepNumber: args.stepNumber,
			name: args.name,
			status: args.status as "queued" | "in_progress" | "completed",
			conclusion: args.conclusion as "success" | "failure" | "cancelled" | "skipped" | undefined,
			startedAt: args.startedAt,
			completedAt: args.completedAt,
			logs: args.logs,
		});
	},
});

export const _getExistingCIRunJob = internalQuery({
	args: { ciRunId: v.id("ciRuns"), jobId: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunJobs")
			.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.ciRunId))
			.filter((q) => q.eq(q.field("jobId"), args.jobId))
			.first();
	},
});

export const _insertCIRunParsedTest = internalMutation({
	args: {
		ciRunId: v.id("ciRuns"),
		stepId: v.id("ciRunJobSteps"),
		testName: v.string(),
		file: v.optional(v.string()),
		line: v.optional(v.number()),
		status: v.union(v.literal("passed"), v.literal("failed"), v.literal("skipped")),
		error: v.optional(v.string()),
		errorDetails: v.optional(v.string()),
		stdout: v.optional(v.string()),
		stderr: v.optional(v.string()),
		duration: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("ciRunParsedTests", {
			ciRunId: args.ciRunId,
			stepId: args.stepId,
			testName: args.testName,
			file: args.file,
			line: args.line,
			status: args.status,
			error: args.error,
			errorDetails: args.errorDetails,
			stdout: args.stdout,
			stderr: args.stderr,
			duration: args.duration,
			parsedAt: Date.now(),
		});
	},
});

export const getCIRunParsedTests = query({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunParsedTests")
			.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.ciRunId))
			.collect();
	},
});

export const getCIRunParsedTestsByStep = query({
	args: {
		stepId: v.id("ciRunJobSteps"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunParsedTests")
			.withIndex("by_step", (q) => q.eq("stepId", args.stepId))
			.collect();
	},
});

// Parse test results from logs (supports Vitest, Jest, Playwright patterns)
function parseTestResultsFromLogs(logs: string): Array<{
	testName: string;
	file?: string;
	line?: number;
	status: "passed" | "failed" | "skipped";
	error?: string;
	errorDetails?: string;
	stdout?: string;
	stderr?: string;
	duration?: number;
}> {
	const tests: Array<{
		testName: string;
		file?: string;
		line?: number;
		status: "passed" | "failed" | "skipped";
		error?: string;
		errorDetails?: string;
		stdout?: string;
		stderr?: string;
		duration?: number;
	}> = [];

	const lines = logs.split("\n");
	let currentTest: {
		testName: string;
		file?: string;
		line?: number;
		status: "passed" | "failed" | "skipped";
		error?: string;
		errorDetails?: string;
		stdout?: string;
		stderr?: string;
		duration?: number;
	} | null = null;
	let errorBuffer: string[] = [];
	let inError = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Vitest patterns
		// FAIL  src/test.ts > Test Suite > test name
		// PASS  src/test.ts > Test Suite > test name (123ms)
		const vitestFailMatch = line.match(/^\s*FAIL\s+(.+?)\s*$/);
		const vitestPassMatch = line.match(/^\s*PASS\s+(.+?)\s*(?:\((\d+(?:\.\d+)?(?:ms|s|m))\))?\s*$/);
		const vitestSkipMatch = line.match(/^\s*SKIP\s+(.+?)\s*$/);

		// Jest patterns
		// FAIL  src/test.test.ts
		// PASS  src/test.test.ts
		const jestFailMatch = line.match(/^\s*FAIL\s+(.+?)\s*$/);
		const jestPassMatch = line.match(/^\s*PASS\s+(.+?)\s*$/);

		// Playwright patterns
		// × test name (123ms)
		// ✓ test name (123ms)
		const playwrightFailMatch = line.match(
			/^\s*×\s+(.+?)\s*(?:\((\d+(?:\.\d+)?(?:ms|s|m))\))?\s*$/
		);
		const playwrightPassMatch = line.match(
			/^\s*✓\s+(.+?)\s*(?:\((\d+(?:\.\d+)?(?:ms|s|m))\))?\s*$/
		);

		// File path extraction (common patterns)
		const fileMatch = line.match(/(?:at|in)\s+([^\s]+\.(?:ts|tsx|js|jsx))(?::(\d+))?/);

		if (vitestFailMatch || jestFailMatch || playwrightFailMatch) {
			// Save previous test if exists
			if (currentTest) {
				if (errorBuffer.length > 0) {
					currentTest.error = errorBuffer.join("\n");
					currentTest.errorDetails = errorBuffer.join("\n");
				}
				tests.push(currentTest);
			}

			const testName = vitestFailMatch?.[1] || jestFailMatch?.[1] || playwrightFailMatch?.[1] || "";
			const durationStr = playwrightFailMatch?.[2];
			const duration = durationStr ? parseDuration(durationStr) : undefined;

			// Extract file path from test name (Vitest format: "file > suite > test")
			const parts = testName.split(" > ");
			const file = parts.length > 1 ? parts[0] : undefined;
			const actualTestName = parts[parts.length - 1];

			currentTest = {
				testName: actualTestName || testName,
				file,
				status: "failed",
				duration,
			};
			errorBuffer = [];
			inError = true;
		} else if (vitestPassMatch || jestPassMatch || playwrightPassMatch) {
			// Save previous test if exists
			if (currentTest) {
				tests.push(currentTest);
			}

			const testName = vitestPassMatch?.[1] || jestPassMatch?.[1] || playwrightPassMatch?.[1] || "";
			const durationStr = vitestPassMatch?.[2] || playwrightPassMatch?.[2];
			const duration = durationStr ? parseDuration(durationStr) : undefined;

			// Extract file path from test name
			const parts = testName.split(" > ");
			const file = parts.length > 1 ? parts[0] : undefined;
			const actualTestName = parts[parts.length - 1];

			currentTest = {
				testName: actualTestName || testName,
				file,
				status: "passed",
				duration,
			};
			errorBuffer = [];
			inError = false;
		} else if (vitestSkipMatch) {
			if (currentTest) {
				tests.push(currentTest);
			}

			const testName = vitestSkipMatch[1];
			const parts = testName.split(" > ");
			const file = parts.length > 1 ? parts[0] : undefined;
			const actualTestName = parts[parts.length - 1];

			currentTest = {
				testName: actualTestName || testName,
				file,
				status: "skipped",
			};
			errorBuffer = [];
			inError = false;
		} else if (currentTest && inError) {
			// Collect error details
			if (
				line.includes("Error:") ||
				line.includes("AssertionError") ||
				line.includes("TypeError") ||
				line.includes("ReferenceError") ||
				line.includes("at ") ||
				line.trim().startsWith("at ")
			) {
				errorBuffer.push(line);
			}
		} else if (fileMatch && currentTest && !currentTest.file) {
			// Extract file path if not already set
			currentTest.file = fileMatch[1];
			if (fileMatch[2]) {
				currentTest.line = Number.parseInt(fileMatch[2], 10);
			}
		}
	}

	// Save last test if exists
	if (currentTest) {
		if (errorBuffer.length > 0) {
			currentTest.error = errorBuffer.join("\n");
			currentTest.errorDetails = errorBuffer.join("\n");
		}
		tests.push(currentTest);
	}

	return tests;
}

// Parse duration string (e.g., "123ms", "1.5s", "2m") to milliseconds
function parseDuration(durationStr: string): number {
	const match = durationStr.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);
	if (!match) return 0;

	const value = Number.parseFloat(match[1]);
	const unit = match[2];

	switch (unit) {
		case "ms":
			return value;
		case "s":
			return value * 1000;
		case "m":
			return value * 60 * 1000;
		default:
			return 0;
	}
}

// Parse GitHub Actions logs to extract step information
function parseGitHubLogs(logs: string): Array<{ name: string; logs: string; stepNumber: number }> {
	const steps: Array<{ name: string; logs: string; stepNumber: number }> = [];
	const lines = logs.split("\n");
	let currentStep: { name: string; logs: string[]; stepNumber: number } | null = null;
	let stepNumber = 0;

	for (const line of lines) {
		// GitHub Actions log format: ##[group]Step name
		if (line.startsWith("##[group]")) {
			// Save previous step if exists
			if (currentStep) {
				steps.push({
					name: currentStep.name,
					logs: currentStep.logs.join("\n"),
					stepNumber: currentStep.stepNumber,
				});
			}
			// Start new step
			const stepName = line.replace("##[group]", "").trim();
			stepNumber++;
			currentStep = { name: stepName, logs: [], stepNumber };
		} else if (line.startsWith("##[endgroup]")) {
			// End of step group
			if (currentStep) {
				steps.push({
					name: currentStep.name,
					logs: currentStep.logs.join("\n"),
					stepNumber: currentStep.stepNumber,
				});
				currentStep = null;
			}
		} else if (currentStep) {
			// Add line to current step (remove GitHub log markers)
			const cleanLine = line
				.replace(/^##\[command\]/, "")
				.replace(/^##\[error\]/, "")
				.replace(/^##\[warning\]/, "");
			currentStep.logs.push(cleanLine);
		}
	}

	// Save last step if exists
	if (currentStep) {
		steps.push({
			name: currentStep.name,
			logs: currentStep.logs.join("\n"),
			stepNumber: currentStep.stepNumber,
		});
	}

	// If no steps found, treat entire log as one step
	if (steps.length === 0) {
		steps.push({
			name: "All Steps",
			logs: logs,
			stepNumber: 1,
		});
	}

	return steps;
}

export const fetchCIRunJobs = action({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		const ciRun = await ctx.runQuery(internal.github._getCIRunById, {
			ciRunId: args.ciRunId,
		});

		if (!ciRun) {
			throw new Error("CI run not found");
		}

		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: ciRun.projectId,
		});

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();

		// Fetch jobs for the workflow run
		const jobsResponse = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs/${ciRun.runId}/jobs`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!jobsResponse.ok) {
			const error = await jobsResponse.text();
			throw new Error(`GitHub API error: ${jobsResponse.status} - ${error}`);
		}

		const jobsData = (await jobsResponse.json()) as { jobs: GitHubJob[] };
		const jobs = jobsData.jobs || [];

		const storedJobIds: Id<"ciRunJobs">[] = [];

		// Process each job
		for (const job of jobs) {
			try {
				// Check if job already exists
				const existing = await ctx.runQuery(internal.github._getExistingCIRunJob, {
					ciRunId: args.ciRunId,
					jobId: job.id,
				});

				const jobData = {
					ciRunId: args.ciRunId,
					jobId: job.id,
					name: job.name,
					status: job.status,
					conclusion: job.conclusion || undefined,
					startedAt: new Date(job.started_at).getTime(),
					completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
					runnerName: job.runner_name || undefined,
					workflowName: job.workflow_name,
				};

				let jobRecordId: Id<"ciRunJobs">;
				if (existing) {
					// Update existing job (we'll add update mutation if needed)
					jobRecordId = existing._id;
				} else {
					jobRecordId = await ctx.runMutation(internal.github._insertCIRunJob, jobData);
				}

				storedJobIds.push(jobRecordId);

				// Fetch logs for this job
				const logsResponse = await fetch(
					`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/jobs/${job.id}/logs`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/vnd.github.v3+json",
						},
					}
				);

				if (logsResponse.ok) {
					const logsText = await logsResponse.text();
					// Truncate logs if too long (max 100KB per step)
					const maxLogSize = 100 * 1024;
					const truncatedLogs =
						logsText.length > maxLogSize
							? `${logsText.substring(0, maxLogSize)}\n... (truncated)`
							: logsText;

					// Parse logs into steps
					const parsedSteps = parseGitHubLogs(truncatedLogs);

					// Store steps, matching with GitHub API step data if available
					for (const parsedStep of parsedSteps) {
						const githubStep = job.steps.find((s) => s.number === parsedStep.stepNumber);

						const stepId = await ctx.runMutation(internal.github._insertCIRunJobStep, {
							jobId: jobRecordId,
							stepNumber: parsedStep.stepNumber,
							name: parsedStep.name || githubStep?.name || `Step ${parsedStep.stepNumber}`,
							status: githubStep?.status || "completed",
							conclusion: githubStep?.conclusion || undefined,
							startedAt: githubStep?.started_at
								? new Date(githubStep.started_at).getTime()
								: new Date(job.started_at).getTime(),
							completedAt: githubStep?.completed_at
								? new Date(githubStep.completed_at).getTime()
								: undefined,
							logs: parsedStep.logs,
						});

						// Parse test results from step logs
						const parsedTests = parseTestResultsFromLogs(parsedStep.logs);
						for (const test of parsedTests) {
							await ctx.runMutation(internal.github._insertCIRunParsedTest, {
								ciRunId: args.ciRunId,
								stepId,
								testName: test.testName,
								file: test.file,
								line: test.line,
								status: test.status,
								error: test.error,
								errorDetails: test.errorDetails,
								stdout: test.stdout,
								stderr: test.stderr,
								duration: test.duration,
							});
						}
					}
				}
			} catch (error) {
				console.error(`Failed to process job ${job.id}:`, error);
				// Continue with other jobs
			}
		}

		return { success: true, jobCount: storedJobIds.length };
	},
});

/**
 * Rerun a GitHub Actions workflow run.
 * Uses GitHub API to restart the workflow run.
 */
export const rerunCIRun = action({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		const ciRun = await ctx.runQuery(internal.github._getCIRunById, {
			ciRunId: args.ciRunId,
		});

		if (!ciRun) {
			throw new Error("CI run not found");
		}

		const project = await ctx.runQuery(internal.github._getProject, {
			projectId: ciRun.projectId,
		});

		if (!project || !project.repository) {
			throw new Error("Project repository not configured");
		}

		const repoInfo = parseRepositoryUrl(project.repository);
		if (!repoInfo) {
			throw new Error(`Invalid repository URL: ${project.repository}`);
		}

		const token = getGitHubToken();

		// Call GitHub API to rerun the workflow run
		// POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun
		const response = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs/${ciRun.runId}/rerun`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
		}

		return { success: true, message: "CI run restarted successfully" };
	},
});

// Internal query to get CI run by ID
export const _getCIRunById = internalQuery({
	args: { ciRunId: v.id("ciRuns") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.ciRunId);
	},
});

export const getCIRunJobs = query({
	args: {
		ciRunId: v.id("ciRuns"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunJobs")
			.withIndex("by_ciRun", (q) => q.eq("ciRunId", args.ciRunId))
			.collect();
	},
});

export const getCIRunJobSteps = query({
	args: {
		jobId: v.id("ciRunJobs"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("ciRunJobSteps")
			.withIndex("by_job", (q) => q.eq("jobId", args.jobId))
			.order("asc")
			.collect();
	},
});

const PRS_PER_PROJECT_LIMIT = 500;

export const getPRsForProject = query({
	args: {
		projectId: v.id("projects"),
		state: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("merged"))),
	},
	handler: async (ctx, args) => {
		const results = await ctx.db
			.query("pullRequests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.order("desc")
			.take(PRS_PER_PROJECT_LIMIT);

		if (args.state) {
			return results.filter((pr) => pr.state === args.state);
		}

		return results;
	},
});

export const getCodeSnippetForTest = query({
	args: {
		testId: v.id("tests"),
	},
	handler: async (ctx, args) => {
		const test = await ctx.db.get(args.testId);
		if (!test || !test.line) {
			return null;
		}

		const snippet = await ctx.db
			.query("codeSnippets")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();

		return snippet;
	},
});

export const storeCodeSnippet = mutation({
	args: {
		testId: v.id("tests"),
		file: v.string(),
		startLine: v.number(),
		endLine: v.number(),
		content: v.string(),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if snippet already exists
		const existing = await ctx.db
			.query("codeSnippets")
			.withIndex("by_test", (q) => q.eq("testId", args.testId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				file: args.file,
				startLine: args.startLine,
				endLine: args.endLine,
				content: args.content,
				language: args.language,
				fetchedAt: Date.now(),
			});
			return existing._id;
		}

		return await ctx.db.insert("codeSnippets", {
			testId: args.testId,
			file: args.file,
			startLine: args.startLine,
			endLine: args.endLine,
			content: args.content,
			language: args.language,
			fetchedAt: Date.now(),
		});
	},
});

// Helper mutation to create fake failing CI runs with jobs and logs (for testing)
export const createFakeFailingCIRuns = internalMutation({
	args: {
		projectId: v.id("projects"),
		count: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const count = args.count || 3;
		const now = Date.now();
		const createdRuns: Id<"ciRuns">[] = [];

		for (let i = 0; i < count; i++) {
			const runId = 1000000 + i; // Fake GitHub run ID
			const workflowId = 12345 + i;
			const startedAt = now - (i + 1) * 3600000; // 1 hour apart
			const completedAt = startedAt + 300000; // 5 minutes duration

			// Create CI run
			const ciRunId = await ctx.db.insert("ciRuns", {
				projectId: args.projectId,
				workflowId,
				workflowName: `CI Workflow ${i + 1}`,
				runId,
				status: "completed",
				conclusion: "failure",
				commitSha: `abc123def456${i}`,
				commitMessage: `Fix: Add feature ${i + 1}`,
				branch: `feature/branch-${i + 1}`,
				startedAt,
				completedAt,
				htmlUrl: `https://github.com/example/repo/actions/runs/${runId}`,
			});

			createdRuns.push(ciRunId);

			// Create 1-2 jobs per run
			const jobCount = i % 2 === 0 ? 1 : 2;
			for (let j = 0; j < jobCount; j++) {
				const jobId = runId * 100 + j;
				const jobStartedAt = startedAt + j * 60000; // 1 minute apart
				const jobCompletedAt = jobStartedAt + 180000; // 3 minutes duration

				const jobRecordId = await ctx.db.insert("ciRunJobs", {
					ciRunId,
					jobId,
					name: `Test Job ${j + 1}`,
					status: "completed",
					conclusion: "failure",
					startedAt: jobStartedAt,
					completedAt: jobCompletedAt,
					runnerName: `ubuntu-latest-${j}`,
					workflowName: `CI Workflow ${i + 1}`,
				});

				// Create 2-3 steps per job with mock logs
				const stepCount = 2 + (j % 2); // 2 or 3 steps
				for (let k = 0; k < stepCount; k++) {
					const stepStartedAt = jobStartedAt + k * 30000; // 30 seconds apart
					const stepCompletedAt = stepStartedAt + 60000; // 1 minute duration
					const isFailureStep = k === stepCount - 1; // Last step fails

					// Generate mock logs
					let mockLogs = `##[group]Step ${k + 1}: ${isFailureStep ? "Run Tests" : "Setup"}\n`;
					mockLogs += `Running step ${k + 1}...\n`;
					mockLogs += "✓ Checking dependencies\n";
					mockLogs += "✓ Installing packages\n";

					if (isFailureStep) {
						mockLogs += "\n##[error]Test failures detected:\n";
						mockLogs +=
							"FAIL  src/components/Button.test.tsx > Button Component > should render correctly\n";
						mockLogs += "  Error: AssertionError: expected 'Click me' to equal 'Click Me'\n";
						mockLogs += "    at Object.<anonymous> (src/components/Button.test.tsx:42:15)\n";
						mockLogs += "    at Test.run (node_modules/vitest/dist/index.js:1234:23)\n";
						mockLogs +=
							"\nFAIL  src/utils/helpers.test.ts > formatDate > should format dates correctly\n";
						mockLogs += "  Error: TypeError: Cannot read property 'toISOString' of undefined\n";
						mockLogs += "    at formatDate (src/utils/helpers.ts:18:5)\n";
						mockLogs += "    at Object.<anonymous> (src/utils/helpers.test.ts:25:10)\n";
						mockLogs += "\n##[error]Process completed with exit code 1.\n";
						mockLogs += "Error: Command failed with exit code 1\n";
					} else {
						mockLogs += "✓ Step completed successfully\n";
						mockLogs += "##[endgroup]\n";
					}

					await ctx.db.insert("ciRunJobSteps", {
						jobId: jobRecordId,
						stepNumber: k + 1,
						name: isFailureStep ? "Run Tests" : `Setup Step ${k + 1}`,
						status: "completed",
						conclusion: isFailureStep ? "failure" : "success",
						startedAt: stepStartedAt,
						completedAt: stepCompletedAt,
						logs: mockLogs,
					});
				}
			}
		}

		return { success: true, createdRuns, count: createdRuns.length };
	},
});
