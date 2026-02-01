import { describe, expect, it } from "vitest";
import { cn, getGitHubBlobUrl, parseRepositoryUrl } from "../utils";

describe("cn", () => {
	it("should merge class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("should handle conditional classes", () => {
		expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
	});

	it("should merge Tailwind classes correctly", () => {
		expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
	});

	it("should handle empty inputs", () => {
		expect(cn()).toBe("");
		expect(cn("")).toBe("");
	});
});

describe("parseRepositoryUrl", () => {
	it("should parse owner/repo format", () => {
		expect(parseRepositoryUrl("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
	});

	it("should parse https://github.com URLs", () => {
		expect(parseRepositoryUrl("https://github.com/owner/repo")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});

	it("should parse https://github.com URLs with .git suffix", () => {
		expect(parseRepositoryUrl("https://github.com/owner/repo.git")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});

	it("should parse https://github.com URLs with trailing slash", () => {
		expect(parseRepositoryUrl("https://github.com/owner/repo/")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});

	it("should parse git@github.com URLs", () => {
		expect(parseRepositoryUrl("git@github.com:owner/repo.git")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});

	it("should parse git@github.com URLs without .git suffix", () => {
		expect(parseRepositoryUrl("git@github.com:owner/repo")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});

	it("should return null for invalid URLs", () => {
		expect(parseRepositoryUrl("invalid-url")).toBeNull();
		expect(parseRepositoryUrl("")).toBeNull();
		expect(parseRepositoryUrl("not-a-repo")).toBeNull();
	});

	it("should handle URLs with paths", () => {
		expect(parseRepositoryUrl("https://github.com/owner/repo/path/to/file")).toEqual({
			owner: "owner",
			repo: "repo",
		});
	});
});

describe("getGitHubBlobUrl", () => {
	it("should build blob URL from owner/repo format", () => {
		expect(getGitHubBlobUrl("owner/repo", "src/file.ts")).toBe(
			"https://github.com/owner/repo/blob/main/src/file.ts"
		);
	});

	it("should build blob URL with line number", () => {
		expect(getGitHubBlobUrl("owner/repo", "src/file.ts", { line: 42 })).toBe(
			"https://github.com/owner/repo/blob/main/src/file.ts#L42"
		);
	});

	it("should build blob URL with custom ref", () => {
		expect(getGitHubBlobUrl("owner/repo", "src/file.ts", { ref: "develop" })).toBe(
			"https://github.com/owner/repo/blob/develop/src/file.ts"
		);
	});

	it("should build blob URL with ref and line number", () => {
		expect(getGitHubBlobUrl("owner/repo", "src/file.ts", { ref: "v1.0.0", line: 10 })).toBe(
			"https://github.com/owner/repo/blob/v1.0.0/src/file.ts#L10"
		);
	});

	it("should build blob URL from https://github.com URL", () => {
		expect(getGitHubBlobUrl("https://github.com/owner/repo", "src/file.ts")).toBe(
			"https://github.com/owner/repo/blob/main/src/file.ts"
		);
	});

	it("should build blob URL from git@github.com URL", () => {
		expect(getGitHubBlobUrl("git@github.com:owner/repo.git", "src/file.ts")).toBe(
			"https://github.com/owner/repo/blob/main/src/file.ts"
		);
	});

	it("should return null for invalid repository URL", () => {
		expect(getGitHubBlobUrl("invalid-url", "src/file.ts")).toBeNull();
	});

	it("should handle file paths with special characters", () => {
		expect(getGitHubBlobUrl("owner/repo", "src/file-name.ts")).toBe(
			"https://github.com/owner/repo/blob/main/src/file-name.ts"
		);
		expect(getGitHubBlobUrl("owner/repo", "src/file name.ts")).toBe(
			"https://github.com/owner/repo/blob/main/src/file name.ts"
		);
	});
});
