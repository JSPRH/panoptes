import { describe, expect, it } from "vitest";
import {
	buildTree,
	getDirectoryPath,
	getFileExtension,
	getFileName,
	isSourceFile,
	isTestFile,
	splitPath,
} from "../pathUtils";

describe("isTestFile", () => {
	it("should identify .test.ts files", () => {
		expect(isTestFile("file.test.ts")).toBe(true);
		expect(isTestFile("file.test.tsx")).toBe(true);
		expect(isTestFile("file.test.js")).toBe(true);
		expect(isTestFile("file.test.jsx")).toBe(true);
	});

	it("should identify .spec.ts files", () => {
		expect(isTestFile("file.spec.ts")).toBe(true);
		expect(isTestFile("file.spec.tsx")).toBe(true);
		expect(isTestFile("file.spec.js")).toBe(true);
		expect(isTestFile("file.spec.jsx")).toBe(true);
	});

	it("should identify test files with paths", () => {
		expect(isTestFile("src/components/Button.test.tsx")).toBe(true);
		expect(isTestFile("tests/utils.spec.ts")).toBe(true);
	});

	it("should identify test files with map extensions", () => {
		expect(isTestFile("file.test.ts.map")).toBe(true);
		expect(isTestFile("file.spec.js.map")).toBe(true);
	});

	it("should be case insensitive", () => {
		expect(isTestFile("file.TEST.ts")).toBe(true);
		expect(isTestFile("file.SPEC.ts")).toBe(true);
	});

	it("should not identify source files as test files", () => {
		expect(isTestFile("file.ts")).toBe(false);
		expect(isTestFile("file.tsx")).toBe(false);
		expect(isTestFile("file.js")).toBe(false);
		expect(isTestFile("file.jsx")).toBe(false);
	});

	it("should not identify files with 'test' in the name", () => {
		expect(isTestFile("test-utils.ts")).toBe(false);
		expect(isTestFile("testHelpers.ts")).toBe(false);
	});
});

describe("isSourceFile", () => {
	it("should identify source files", () => {
		expect(isSourceFile("file.ts")).toBe(true);
		expect(isSourceFile("file.tsx")).toBe(true);
		expect(isSourceFile("file.js")).toBe(true);
		expect(isSourceFile("file.jsx")).toBe(true);
	});

	it("should not identify test files as source files", () => {
		expect(isSourceFile("file.test.ts")).toBe(false);
		expect(isSourceFile("file.spec.tsx")).toBe(false);
	});

	it("should handle files without extensions", () => {
		expect(isSourceFile("file")).toBe(true);
		expect(isSourceFile("README")).toBe(true);
	});
});

describe("getFileExtension", () => {
	it("should extract extension from file path", () => {
		expect(getFileExtension("file.ts")).toBe("ts");
		expect(getFileExtension("file.tsx")).toBe("tsx");
		expect(getFileExtension("file.js")).toBe("js");
	});

	it("should handle files with multiple dots", () => {
		expect(getFileExtension("file.test.ts")).toBe("ts");
		expect(getFileExtension("file.min.js")).toBe("js");
	});

	it("should return empty string for files without extension", () => {
		expect(getFileExtension("file")).toBe("");
		expect(getFileExtension("README")).toBe("");
	});

	it("should handle paths with directories", () => {
		expect(getFileExtension("src/components/Button.tsx")).toBe("tsx");
		expect(getFileExtension("tests/utils.test.ts")).toBe("ts");
	});

	it("should handle files starting with dot", () => {
		expect(getFileExtension(".gitignore")).toBe("gitignore");
		expect(getFileExtension(".env")).toBe("env");
	});
});

describe("getDirectoryPath", () => {
	it("should extract directory from file path", () => {
		expect(getDirectoryPath("src/file.ts")).toBe("src");
		expect(getDirectoryPath("src/components/Button.tsx")).toBe("src/components");
	});

	it("should handle Windows paths", () => {
		expect(getDirectoryPath("src\\file.ts")).toBe("src");
		expect(getDirectoryPath("src\\components\\Button.tsx")).toBe("src\\components");
	});

	it("should return empty string for root files", () => {
		expect(getDirectoryPath("file.ts")).toBe("");
		expect(getDirectoryPath("README.md")).toBe("");
	});

	it("should handle nested paths", () => {
		expect(getDirectoryPath("a/b/c/file.ts")).toBe("a/b/c");
		expect(getDirectoryPath("a/b/c/d/e/file.ts")).toBe("a/b/c/d/e");
	});
});

describe("getFileName", () => {
	it("should extract filename from path", () => {
		expect(getFileName("file.ts")).toBe("file.ts");
		expect(getFileName("src/file.ts")).toBe("file.ts");
		expect(getFileName("src/components/Button.tsx")).toBe("Button.tsx");
	});

	it("should handle Windows paths", () => {
		expect(getFileName("src\\file.ts")).toBe("file.ts");
		expect(getFileName("src\\components\\Button.tsx")).toBe("Button.tsx");
	});

	it("should handle root files", () => {
		expect(getFileName("README.md")).toBe("README.md");
		expect(getFileName("package.json")).toBe("package.json");
	});
});

describe("splitPath", () => {
	it("should split Unix paths", () => {
		expect(splitPath("src/file.ts")).toEqual(["src", "file.ts"]);
		expect(splitPath("src/components/Button.tsx")).toEqual(["src", "components", "Button.tsx"]);
	});

	it("should split Windows paths", () => {
		expect(splitPath("src\\file.ts")).toEqual(["src", "file.ts"]);
		expect(splitPath("src\\components\\Button.tsx")).toEqual(["src", "components", "Button.tsx"]);
	});

	it("should handle root files", () => {
		expect(splitPath("file.ts")).toEqual(["file.ts"]);
	});

	it("should filter empty segments", () => {
		expect(splitPath("src//file.ts")).toEqual(["src", "file.ts"]);
		expect(splitPath("//file.ts")).toEqual(["file.ts"]);
		expect(splitPath("/src/file.ts")).toEqual(["src", "file.ts"]);
	});

	it("should handle mixed separators", () => {
		expect(splitPath("src\\components/file.ts")).toEqual(["src", "components", "file.ts"]);
	});
});

describe("buildTree", () => {
	it("should build tree from flat file list", () => {
		const files = [
			{ file: "src/file1.ts", linesCovered: 10, linesTotal: 20 },
			{ file: "src/file2.ts", linesCovered: 15, linesTotal: 25 },
		];

		const tree = buildTree(files);
		expect(tree).toHaveLength(1);
		expect(tree[0].name).toBe("src");
		expect(tree[0].type).toBe("directory");
		expect(tree[0].children).toHaveLength(2);
		expect(tree[0].linesCovered).toBe(25);
		expect(tree[0].linesTotal).toBe(45);
		expect(tree[0].coverage).toBeCloseTo((25 / 45) * 100, 1);
	});

	it("should handle nested directories", () => {
		const files = [
			{ file: "src/components/Button.tsx", linesCovered: 10, linesTotal: 20 },
			{ file: "src/utils/helpers.ts", linesCovered: 5, linesTotal: 10 },
		];

		const tree = buildTree(files);
		expect(tree).toHaveLength(1);
		expect(tree[0].name).toBe("src");
		expect(tree[0].type).toBe("directory");
		expect(tree[0].children).toHaveLength(2);
		expect(tree[0].children?.[0].name).toBe("components");
		expect(tree[0].children?.[1].name).toBe("utils");
	});

	it("should sort directories before files", () => {
		const files = [
			{ file: "src/file.ts", linesCovered: 10, linesTotal: 20 },
			{ file: "src/components/Button.tsx", linesCovered: 5, linesTotal: 10 },
		];

		const tree = buildTree(files);
		expect(tree[0].children?.[0].name).toBe("components");
		expect(tree[0].children?.[1].name).toBe("file.ts");
	});

	it("should handle empty file list", () => {
		const tree = buildTree([]);
		expect(tree).toEqual([]);
	});

	it("should calculate coverage correctly", () => {
		const files = [
			{ file: "file1.ts", linesCovered: 50, linesTotal: 100 },
			{ file: "file2.ts", linesCovered: 25, linesTotal: 50 },
		];

		const tree = buildTree(files);
		expect(tree[0].coverage).toBe(50);
	});

	it("should handle zero total lines", () => {
		const files = [{ file: "file.ts", linesCovered: 0, linesTotal: 0 }];

		const tree = buildTree(files);
		expect(tree[0].coverage).toBeUndefined();
	});

	it("should sort children alphabetically within type", () => {
		const files = [
			{ file: "src/zebra.ts", linesCovered: 10, linesTotal: 20 },
			{ file: "src/alpha.ts", linesCovered: 5, linesTotal: 10 },
			{ file: "src/components/Button.tsx", linesCovered: 5, linesTotal: 10 },
		];

		const tree = buildTree(files);
		const children = tree[0].children || [];
		expect(children[0].name).toBe("components");
		expect(children[1].name).toBe("alpha.ts");
		expect(children[2].name).toBe("zebra.ts");
	});

	it("should handle files at root level", () => {
		const files = [
			{ file: "file1.ts", linesCovered: 10, linesTotal: 20 },
			{ file: "file2.ts", linesCovered: 5, linesTotal: 10 },
		];

		const tree = buildTree(files);
		expect(tree).toHaveLength(2);
		expect(tree[0].name).toBe("file1.ts");
		expect(tree[1].name).toBe("file2.ts");
	});
});
