import { describe, expect, it } from "vitest";
import {
	buildTree,
	getDirectoryPath,
	getFileExtension,
	getFileName,
	isSourceFile,
	isTestFile,
	splitPath,
} from "../apps/web/src/lib/pathUtils";
import { cn, getGitHubBlobUrl, parseRepositoryUrl } from "../apps/web/src/lib/utils";

describe("pathUtils", () => {
	describe("isTestFile", () => {
		it("should identify .test.ts files", () => {
			expect(isTestFile("file.test.ts")).toBe(true);
			expect(isTestFile("src/utils.test.ts")).toBe(true);
			expect(isTestFile("packages/shared/index.test.ts")).toBe(true);
		});

		it("should identify .spec.ts files", () => {
			expect(isTestFile("file.spec.ts")).toBe(true);
			expect(isTestFile("component.spec.tsx")).toBe(true);
		});

		it("should identify test files with different extensions", () => {
			expect(isTestFile("file.test.js")).toBe(true);
			expect(isTestFile("file.test.tsx")).toBe(true);
			expect(isTestFile("file.test.jsx")).toBe(true);
		});

		it("should identify test files in paths with dots", () => {
			expect(isTestFile("file.test.ts.map")).toBe(true);
			expect(isTestFile("file.spec.js.map")).toBe(true);
		});

		it("should not identify source files as test files", () => {
			expect(isTestFile("file.ts")).toBe(false);
			expect(isTestFile("src/utils.ts")).toBe(false);
			expect(isTestFile("component.tsx")).toBe(false);
		});

		it("should be case insensitive", () => {
			expect(isTestFile("file.TEST.ts")).toBe(true);
			expect(isTestFile("file.Spec.TS")).toBe(true);
		});
	});

	describe("isSourceFile", () => {
		it("should identify source files", () => {
			expect(isSourceFile("file.ts")).toBe(true);
			expect(isSourceFile("src/utils.ts")).toBe(true);
			expect(isSourceFile("component.tsx")).toBe(true);
		});

		it("should not identify test files as source files", () => {
			expect(isSourceFile("file.test.ts")).toBe(false);
			expect(isSourceFile("file.spec.ts")).toBe(false);
		});
	});

	describe("getFileExtension", () => {
		it("should extract file extension", () => {
			expect(getFileExtension("file.ts")).toBe("ts");
			expect(getFileExtension("file.js")).toBe("js");
			expect(getFileExtension("file.test.tsx")).toBe("tsx");
		});

		it("should return empty string for files without extension", () => {
			expect(getFileExtension("file")).toBe("");
			expect(getFileExtension("README")).toBe("");
		});

		it("should handle paths with directories", () => {
			expect(getFileExtension("src/utils.ts")).toBe("ts");
			expect(getFileExtension("packages/shared/index.ts")).toBe("ts");
		});

		it("should handle files with multiple dots", () => {
			expect(getFileExtension("file.test.ts")).toBe("ts");
			expect(getFileExtension("file.min.js")).toBe("js");
		});
	});

	describe("getDirectoryPath", () => {
		it("should extract directory from Unix paths", () => {
			expect(getDirectoryPath("src/utils.ts")).toBe("src");
			expect(getDirectoryPath("packages/shared/index.ts")).toBe("packages/shared");
		});

		it("should extract directory from Windows paths", () => {
			expect(getDirectoryPath("src\\utils.ts")).toBe("src");
			expect(getDirectoryPath("packages\\shared\\index.ts")).toBe("packages\\shared");
		});

		it("should return empty string for files in root", () => {
			expect(getDirectoryPath("file.ts")).toBe("");
		});
	});

	describe("getFileName", () => {
		it("should extract filename from path", () => {
			expect(getFileName("src/utils.ts")).toBe("utils.ts");
			expect(getFileName("packages/shared/index.ts")).toBe("index.ts");
			expect(getFileName("file.ts")).toBe("file.ts");
		});

		it("should handle Windows paths", () => {
			expect(getFileName("src\\utils.ts")).toBe("utils.ts");
			expect(getFileName("packages\\shared\\index.ts")).toBe("index.ts");
		});
	});

	describe("splitPath", () => {
		it("should split Unix paths", () => {
			expect(splitPath("src/utils.ts")).toEqual(["src", "utils.ts"]);
			expect(splitPath("packages/shared/index.ts")).toEqual(["packages", "shared", "index.ts"]);
		});

		it("should split Windows paths", () => {
			expect(splitPath("src\\utils.ts")).toEqual(["src", "utils.ts"]);
			expect(splitPath("packages\\shared\\index.ts")).toEqual(["packages", "shared", "index.ts"]);
		});

		it("should handle root files", () => {
			expect(splitPath("file.ts")).toEqual(["file.ts"]);
		});

		it("should filter empty segments", () => {
			expect(splitPath("src//utils.ts")).toEqual(["src", "utils.ts"]);
			expect(splitPath("///file.ts")).toEqual(["file.ts"]);
		});
	});

	describe("buildTree", () => {
		it("should build a simple tree from flat file list", () => {
			const files = [
				{ file: "src/utils.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "src/index.ts", linesCovered: 5, linesTotal: 10 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("src");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[0]?.children).toBeDefined();
			expect(tree[0]?.children).toHaveLength(2);
			expect(tree[0]?.linesCovered).toBe(15);
			expect(tree[0]?.linesTotal).toBe(30);
			expect(tree[0]?.coverage).toBe(50);
		});

		it("should build nested directory structure", () => {
			const files = [
				{ file: "packages/shared/index.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "packages/shared/types.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "packages/cli/index.ts", linesCovered: 8, linesTotal: 15 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("packages");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[0]?.children).toBeDefined();
			expect(tree[0]?.children).toHaveLength(2);
			expect(tree[0]?.linesCovered).toBe(23);
			expect(tree[0]?.linesTotal).toBe(45);
		});

		it("should handle empty file list", () => {
			const tree = buildTree([]);
			expect(tree).toHaveLength(0);
		});

		it("should return tree structure for single file", () => {
			const files = [{ file: "src/utils.ts", linesCovered: 8, linesTotal: 10 }];

			const tree = buildTree(files);
			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("src");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[0]?.children).toBeDefined();
			expect(tree[0]?.children).toHaveLength(1);
			expect(tree[0]?.linesCovered).toBe(8);
			expect(tree[0]?.linesTotal).toBe(10);
			expect(tree[0]?.coverage).toBe(80);
		});

		it("should handle adding files to existing directories (covers line 122)", () => {
			const files = [
				{ file: "src/utils.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "src/index.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "src/helpers.ts", linesCovered: 8, linesTotal: 15 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.children).toHaveLength(3);
			expect(tree[0]?.linesCovered).toBe(23);
			expect(tree[0]?.linesTotal).toBe(45);
		});

		it("should recursively process nested directories with children (covers lines 140-147)", () => {
			const files = [
				{ file: "packages/shared/src/index.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "packages/shared/src/types.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "packages/shared/lib/utils.ts", linesCovered: 8, linesTotal: 15 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("packages");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[0]?.children).toBeDefined();
			expect(tree[0]?.children).toHaveLength(1);

			const sharedDir = tree[0]?.children?.[0];
			expect(sharedDir?.name).toBe("shared");
			expect(sharedDir?.type).toBe("directory");
			expect(sharedDir?.children).toHaveLength(2);
			expect(sharedDir?.linesCovered).toBe(23);
			expect(sharedDir?.linesTotal).toBe(45);
		});

		it("should sort children with directories first, then files alphabetically (covers lines 151-154)", () => {
			const files = [
				{ file: "src/zebra.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "src/utils.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "src/components/Button.tsx", linesCovered: 8, linesTotal: 15 },
				{ file: "src/components/Input.tsx", linesCovered: 6, linesTotal: 12 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			const srcDir = tree[0];
			expect(srcDir?.children).toBeDefined();
			expect(srcDir?.children).toHaveLength(3);

			// Directories should come first
			expect(srcDir?.children?.[0]?.name).toBe("components");
			expect(srcDir?.children?.[0]?.type).toBe("directory");

			// Files should come after directories, sorted alphabetically
			expect(srcDir?.children?.[1]?.name).toBe("utils.ts");
			expect(srcDir?.children?.[1]?.type).toBe("file");
			expect(srcDir?.children?.[2]?.name).toBe("zebra.ts");
			expect(srcDir?.children?.[2]?.type).toBe("file");

			// Check nested directory sorting
			const componentsDir = srcDir?.children?.[0];
			expect(componentsDir?.children).toHaveLength(2);
			expect(componentsDir?.children?.[0]?.name).toBe("Button.tsx");
			expect(componentsDir?.children?.[1]?.name).toBe("Input.tsx");
		});

		it("should sort root nodes with directories first, then files alphabetically (covers lines 171-174)", () => {
			const files = [
				{ file: "zebra.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "src/utils.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "alpha.ts", linesCovered: 8, linesTotal: 15 },
				{ file: "components/Button.tsx", linesCovered: 6, linesTotal: 12 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(4);

			// Directories should come first
			expect(tree[0]?.name).toBe("components");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[1]?.name).toBe("src");
			expect(tree[1]?.type).toBe("directory");

			// Files should come after directories, sorted alphabetically
			expect(tree[2]?.name).toBe("alpha.ts");
			expect(tree[2]?.type).toBe("file");
			expect(tree[3]?.name).toBe("zebra.ts");
			expect(tree[3]?.type).toBe("file");
		});

		it("should handle files with zero total lines", () => {
			const files = [
				{ file: "src/utils.ts", linesCovered: 0, linesTotal: 0 },
				{ file: "src/index.ts", linesCovered: 5, linesTotal: 10 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.coverage).toBeDefined();
			expect(tree[0]?.linesCovered).toBe(5);
			expect(tree[0]?.linesTotal).toBe(10);
		});

		it("should handle deeply nested directory structures", () => {
			const files = [
				{ file: "a/b/c/d/e/file1.ts", linesCovered: 10, linesTotal: 20 },
				{ file: "a/b/c/d/e/file2.ts", linesCovered: 5, linesTotal: 10 },
				{ file: "a/b/c/f/file3.ts", linesCovered: 8, linesTotal: 15 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("a");
			expect(tree[0]?.type).toBe("directory");
			expect(tree[0]?.linesCovered).toBe(23);
			expect(tree[0]?.linesTotal).toBe(45);
		});

		it("should handle adding files to directories that already have children maps (covers lines 126-127, 129-133)", () => {
			// This test covers the case where a directory node exists and we need to
			// convert its existing children array to a map when adding more files
			const files = [
				{ file: "src/components/Button.tsx", linesCovered: 10, linesTotal: 20 },
				{ file: "src/components/Input.tsx", linesCovered: 5, linesTotal: 10 },
				{ file: "src/components/Modal.tsx", linesCovered: 8, linesTotal: 15 },
			];

			const tree = buildTree(files);

			expect(tree).toHaveLength(1);
			expect(tree[0]?.name).toBe("src");
			expect(tree[0]?.type).toBe("directory");
			const componentsDir = tree[0]?.children?.[0];
			expect(componentsDir?.name).toBe("components");
			expect(componentsDir?.type).toBe("directory");
			expect(componentsDir?.children).toHaveLength(3);
			expect(componentsDir?.linesCovered).toBe(23);
			expect(componentsDir?.linesTotal).toBe(45);
		});
	});
});

describe("utils", () => {
	describe("parseRepositoryUrl", () => {
		it("should parse HTTPS GitHub URLs", () => {
			const result = parseRepositoryUrl("https://github.com/owner/repo");
			expect(result).toEqual({ owner: "owner", repo: "repo" });
		});

		it("should parse HTTPS GitHub URLs with .git suffix", () => {
			const result = parseRepositoryUrl("https://github.com/owner/repo.git");
			expect(result).toEqual({ owner: "owner", repo: "repo" });
		});

		it("should parse SSH GitHub URLs", () => {
			const result = parseRepositoryUrl("git@github.com:owner/repo.git");
			expect(result).toEqual({ owner: "owner", repo: "repo" });
		});

		it("should parse owner/repo format", () => {
			const result = parseRepositoryUrl("owner/repo");
			expect(result).toEqual({ owner: "owner", repo: "repo" });
		});

		it("should return null for invalid URLs", () => {
			expect(parseRepositoryUrl("invalid-url")).toBeNull();
			expect(parseRepositoryUrl("https://gitlab.com/owner/repo")).toBeNull();
		});
	});

	describe("getGitHubBlobUrl", () => {
		it("should build blob URL from repository and file", () => {
			const url = getGitHubBlobUrl("owner/repo", "src/utils.ts");
			expect(url).toBe("https://github.com/owner/repo/blob/main/src/utils.ts");
		});

		it("should include line number when provided", () => {
			const url = getGitHubBlobUrl("owner/repo", "src/utils.ts", { line: 42 });
			expect(url).toBe("https://github.com/owner/repo/blob/main/src/utils.ts#L42");
		});

		it("should use custom ref when provided", () => {
			const url = getGitHubBlobUrl("owner/repo", "src/utils.ts", { ref: "develop" });
			expect(url).toBe("https://github.com/owner/repo/blob/develop/src/utils.ts");
		});

		it("should combine ref and line number", () => {
			const url = getGitHubBlobUrl("owner/repo", "src/utils.ts", {
				ref: "develop",
				line: 42,
			});
			expect(url).toBe("https://github.com/owner/repo/blob/develop/src/utils.ts#L42");
		});

		it("should return null for invalid repository", () => {
			const url = getGitHubBlobUrl("invalid", "src/utils.ts");
			expect(url).toBeNull();
		});
	});

	describe("cn", () => {
		it("should merge class names", () => {
			const result = cn("foo", "bar");
			expect(result).toBe("foo bar");
		});

		it("should handle conditional classes", () => {
			const result = cn("foo", false && "bar", "baz");
			expect(result).toBe("foo baz");
		});

		it("should merge Tailwind classes correctly", () => {
			const result = cn("px-2 py-1", "px-4");
			// twMerge should deduplicate conflicting classes
			expect(result).toContain("py-1");
			expect(result).toContain("px-4");
			expect(result).not.toContain("px-2");
		});
	});
});
