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

function getGitHubToken(): string {
	const token = process.env.GITHUB_ACCESS_TOKEN_STORYBOOK;
	if (!token) {
		throw new Error("GITHUB_ACCESS_TOKEN_STORYBOOK not configured in Convex secrets");
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
		return await ctx.db.insert("ciRuns", {
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

		const data = (await response.json()) as { workflow_runs: GitHubWorkflowRun[] };
		const workflowRuns = data.workflow_runs || [];

		// Store CI runs in database
		const storedRuns: Id<"ciRuns">[] = [];
		for (const run of workflowRuns) {
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
					completedAt: run.status === "completed" ? new Date(run.updated_at).getTime() : undefined,
					htmlUrl: run.html_url,
				});
				storedRuns.push(existing._id);
			} else {
				// Insert new run
				const runId = await ctx.runMutation(internal.github._insertCIRun, {
					projectId: args.projectId,
					workflowId: run.workflow_id,
					workflowName: run.name,
					runId: run.id,
					status: run.status,
					conclusion: run.conclusion || undefined,
					commitSha: run.head_sha,
					branch: run.head_branch,
					startedAt: new Date(run.created_at).getTime(),
					completedAt: run.status === "completed" ? new Date(run.updated_at).getTime() : undefined,
					htmlUrl: run.html_url,
				});
				storedRuns.push(runId);
			}
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

		// Store/update PRs in database
		const storedPRs: Id<"pullRequests">[] = [];
		for (const pr of prs) {
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
		const fileResponse = await fetch(
			`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeURIComponent(args.file)}?ref=${ref}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			}
		);

		if (!fileResponse.ok) {
			const error = await fileResponse.text();
			throw new Error(`GitHub API error: ${fileResponse.status} - ${error}`);
		}

		const fileData = (await fileResponse.json()) as GitHubFileContent;
		const content = Buffer.from(fileData.content, "base64").toString("utf-8");
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

export const syncProjectGitHubData = action({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		await ctx.runAction(api.github.getCIRuns, { projectId: args.projectId });
		await ctx.runAction(api.github.getOpenPRs, { projectId: args.projectId });
		return { success: true };
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

export const getPRsForProject = query({
	args: {
		projectId: v.id("projects"),
		state: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("merged"))),
	},
	handler: async (ctx, args) => {
		const query = ctx.db
			.query("pullRequests")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId));

		const results = await query.order("desc").collect();

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
