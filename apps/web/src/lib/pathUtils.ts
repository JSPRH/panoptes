/**
 * Utility functions for working with file paths
 */

const TEST_FILE_PATTERNS = [
	/\.test\.(ts|tsx|js|jsx)$/i,
	/\.spec\.(ts|tsx|js|jsx)$/i,
	/\.test\.(ts|tsx|js|jsx)\./i, // e.g., file.test.ts.map
	/\.spec\.(ts|tsx|js|jsx)\./i,
];

/**
 * Check if a file path matches test file patterns
 */
export function isTestFile(path: string): boolean {
	return TEST_FILE_PATTERNS.some((pattern) => pattern.test(path));
}

/**
 * Check if a file path is a source code file (not a test file)
 */
export function isSourceFile(path: string): boolean {
	return !isTestFile(path);
}

/**
 * Extract file extension from path
 */
export function getFileExtension(path: string): string {
	const lastDot = path.lastIndexOf(".");
	if (lastDot === -1) return "";
	return path.slice(lastDot + 1);
}

/**
 * Extract directory path from file path
 */
export function getDirectoryPath(path: string): string {
	const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	if (lastSlash === -1) return "";
	return path.slice(0, lastSlash);
}

/**
 * Get the filename from a path
 */
export function getFileName(path: string): string {
	const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return path.slice(lastSlash + 1);
}

/**
 * Split a path into its directory segments
 */
export function splitPath(path: string): string[] {
	return path.split(/[/\\]/).filter((segment) => segment.length > 0);
}

/**
 * Tree node structure for hierarchical file organization
 */
export interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	linesCovered?: number;
	linesTotal?: number;
	coverage?: number; // percentage
	children?: TreeNode[];
}

/**
 * Build a tree structure from a flat list of file coverage data
 */
export function buildTree(
	files: Array<{ file: string; linesCovered: number; linesTotal: number }>
): TreeNode[] {
	// Use a Map to track directory nodes and their child Maps
	const directoryMaps = new Map<TreeNode, Map<string, TreeNode>>();
	const root: Map<string, TreeNode> = new Map();

	for (const fileData of files) {
		const segments = splitPath(fileData.file);
		if (segments.length === 0) continue;

		let current = root;
		let currentPath = "";

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const isLast = i === segments.length - 1;
			const path = currentPath ? `${currentPath}/${segment}` : segment;

			if (isLast) {
				// This is a file
				const node: TreeNode = {
					name: segment,
					path: fileData.file,
					type: "file",
					linesCovered: fileData.linesCovered,
					linesTotal: fileData.linesTotal,
					coverage:
						fileData.linesTotal > 0
							? (fileData.linesCovered / fileData.linesTotal) * 100
							: undefined,
				};
				current.set(segment, node);
			} else {
				// This is a directory
				if (!current.has(segment)) {
					const dirNode: TreeNode = {
						name: segment,
						path,
						type: "directory",
						children: [],
					};
					const childMap = new Map<string, TreeNode>();
					directoryMaps.set(dirNode, childMap);
					current.set(segment, dirNode);
				}
				const dirNode = current.get(segment);
				if (dirNode) {
					// Get or create the map for this directory's children
					let nextLevel = directoryMaps.get(dirNode);
					if (!nextLevel) {
						nextLevel = new Map<string, TreeNode>();
						directoryMaps.set(dirNode, nextLevel);
						// Convert existing children array to map
						if (dirNode.children) {
							for (const child of dirNode.children) {
								nextLevel.set(child.name, child);
							}
						}
					}
					current = nextLevel;
				}
				currentPath = path;
			}
		}
	}

	// Convert maps to arrays and aggregate directory coverage
	function processNode(node: TreeNode): TreeNode {
		if (node.type === "directory") {
			const childMap = directoryMaps.get(node);
			const children = childMap ? Array.from(childMap.values()) : node.children || [];

			// Aggregate coverage from children
			let totalLinesCovered = 0;
			let totalLinesTotal = 0;
			const processedChildren: TreeNode[] = [];

			for (const child of children) {
				const processed = processNode(child);
				processedChildren.push(processed);
				if (processed.linesCovered !== undefined) {
					totalLinesCovered += processed.linesCovered;
				}
				if (processed.linesTotal !== undefined) {
					totalLinesTotal += processed.linesTotal;
				}
			}

			// Sort children: directories first, then files, both alphabetically
			processedChildren.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === "directory" ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			});

			return {
				...node,
				children: processedChildren,
				linesCovered: totalLinesCovered,
				linesTotal: totalLinesTotal,
				coverage: totalLinesTotal > 0 ? (totalLinesCovered / totalLinesTotal) * 100 : undefined,
			};
		}
		return node;
	}

	// Convert root map to array and process
	const rootNodes: TreeNode[] = Array.from(root.values()).map(processNode);
	rootNodes.sort((a, b) => {
		if (a.type !== b.type) {
			return a.type === "directory" ? -1 : 1;
		}
		return a.name.localeCompare(b.name);
	});

	return rootNodes;
}
