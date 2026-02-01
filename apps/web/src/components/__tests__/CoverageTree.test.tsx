import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TreeNode } from "../../lib/pathUtils";
import { CoverageTree } from "../CoverageTree";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const renderWithRouter = (component: React.ReactElement) => {
	return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("CoverageTree", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
	});

	describe("Directory Node Rendering", () => {
		it("should render directory node with name", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [],
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("src")).toBeInTheDocument();
		});

		it("should render directory with children", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [
					{
						name: "file.ts",
						path: "src/file.ts",
						type: "file",
						linesCovered: 10,
						linesTotal: 20,
						coverage: 50,
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("src")).toBeInTheDocument();
			expect(screen.getByText("file.ts")).toBeInTheDocument();
		});

		it("should auto-expand first 2 levels", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [
					{
						name: "components",
						path: "src/components",
						type: "directory",
						children: [
							{
								name: "file.ts",
								path: "src/components/file.ts",
								type: "file",
								linesCovered: 10,
								linesTotal: 20,
								coverage: 50,
							},
						],
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} />);
			// First level should be expanded
			expect(screen.getByText("components")).toBeInTheDocument();
			// Second level should also be expanded
			expect(screen.getByText("file.ts")).toBeInTheDocument();
		});

		it("should collapse deeper levels by default", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [
					{
						name: "components",
						path: "src/components",
						type: "directory",
						children: [
							{
								name: "ui",
								path: "src/components/ui",
								type: "directory",
								children: [
									{
										name: "file.ts",
										path: "src/components/ui/file.ts",
										type: "file",
										linesCovered: 10,
										linesTotal: 20,
										coverage: 50,
									},
								],
							},
						],
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} level={0} />);
			expect(screen.getByText("src")).toBeInTheDocument();
			expect(screen.getByText("components")).toBeInTheDocument();
			// Level 2 (ui) should not be visible initially
			expect(screen.queryByText("file.ts")).not.toBeInTheDocument();
		});

		it("should toggle expand/collapse on button click", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [
					{
						name: "file.ts",
						path: "src/file.ts",
						type: "file",
						linesCovered: 10,
						linesTotal: 20,
						coverage: 50,
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} />);
			// Initially expanded (level < 2)
			expect(screen.getByText("file.ts")).toBeInTheDocument();

			// Find and click collapse button
			const expandButton = screen.getByLabelText("Collapse");
			fireEvent.click(expandButton);

			// Should be collapsed now
			expect(screen.queryByText("file.ts")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Expand")).toBeInTheDocument();

			// Click again to expand
			fireEvent.click(screen.getByLabelText("Expand"));
			expect(screen.getByText("file.ts")).toBeInTheDocument();
		});

		it("should not show expand button for empty directories", () => {
			const node: TreeNode = {
				name: "empty",
				path: "empty",
				type: "directory",
				children: [],
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.queryByLabelText("Expand")).not.toBeInTheDocument();
			expect(screen.queryByLabelText("Collapse")).not.toBeInTheDocument();
		});
	});

	describe("File Node Rendering", () => {
		it("should render file node with name", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("file.ts")).toBeInTheDocument();
		});

		it("should navigate to file coverage detail on click", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const fileButton = screen.getByText("file.ts");
			fireEvent.click(fileButton);

			expect(mockNavigate).toHaveBeenCalledWith("/coverage/src/file.ts");
		});

		it("should encode file path correctly in navigation", () => {
			const node: TreeNode = {
				name: "file with spaces.ts",
				path: "src/file with spaces.ts",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const fileButton = screen.getByText("file with spaces.ts");
			fireEvent.click(fileButton);

			expect(mockNavigate).toHaveBeenCalledWith(
				"/coverage/src/file%20with%20spaces.ts"
			);
		});

		it("should not navigate when clicking directory", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [],
			};

			renderWithRouter(<CoverageTree node={node} />);
			const dirName = screen.getByText("src");
			fireEvent.click(dirName);

			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe("Coverage Display", () => {
		it("should display line coverage by default", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 15,
				linesTotal: 30,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("50.0%")).toBeInTheDocument();
			expect(screen.getByText("15/30")).toBeInTheDocument();
		});

		it("should display statement coverage when useStatementCoverage is true", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 15,
				linesTotal: 30,
				statementsCovered: 20,
				statementsTotal: 40,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} useStatementCoverage={true} />);
			expect(screen.getByText("20/40")).toBeInTheDocument();
		});

		it("should show coverage badge with success variant for >= 80%", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 80,
				linesTotal: 100,
				coverage: 80,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const badge = screen.getByText("80.0%");
			expect(badge).toBeInTheDocument();
			expect(badge.className).toContain("bg-success");
		});

		it("should show coverage badge with warning variant for >= 50% and < 80%", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 50,
				linesTotal: 100,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const badge = screen.getByText("50.0%");
			expect(badge.className).toContain("bg-warning");
		});

		it("should show coverage badge with error variant for < 50%", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 30,
				linesTotal: 100,
				coverage: 30,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const badge = screen.getByText("30.0%");
			expect(badge.className).toContain("bg-error");
		});

		it("should not show coverage info when no coverage data exists", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.queryByText(/\d+\.\d+%/)).not.toBeInTheDocument();
		});

		it("should handle zero coverage", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 0,
				linesTotal: 100,
				coverage: 0,
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("0.0%")).toBeInTheDocument();
			expect(screen.getByText("0/100")).toBeInTheDocument();
		});

		it("should handle 100% coverage", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 100,
				linesTotal: 100,
				coverage: 100,
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("100.0%")).toBeInTheDocument();
			expect(screen.getByText("100/100")).toBeInTheDocument();
		});

		it("should show progress bar with correct width", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 75,
				linesTotal: 100,
				coverage: 75,
			};

			renderWithRouter(<CoverageTree node={node} />);
			const progressBar = screen
				.getByText("75.0%")
				.closest("div")
				?.querySelector('[style*="width"]');
			expect(progressBar).toBeInTheDocument();
			expect(progressBar?.getAttribute("style")).toContain("width: 75%");
		});

		it("should clamp progress bar width to 0-100%", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 150,
				linesTotal: 100,
				coverage: 150, // Invalid but should be clamped
			};

			renderWithRouter(<CoverageTree node={node} />);
			const progressBar = screen
				.getByText("150.0%")
				.closest("div")
				?.querySelector('[style*="width"]');
			expect(progressBar?.getAttribute("style")).toContain("width: 100%");
		});
	});

	describe("Historical Coverage", () => {
		it("should display historical coverage increase indicator", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 80,
				linesTotal: 100,
				coverage: 80,
				historicalCoverage: {
					coverage: 70,
					change: 10,
				},
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText(/↑\s*10\.0%/)).toBeInTheDocument();
		});

		it("should display historical coverage decrease indicator", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 60,
				linesTotal: 100,
				coverage: 60,
				historicalCoverage: {
					coverage: 70,
					change: -10,
				},
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText(/↓\s*10\.0%/)).toBeInTheDocument();
		});

		it("should display historical coverage no change indicator", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 70,
				linesTotal: 100,
				coverage: 70,
				historicalCoverage: {
					coverage: 70,
					change: 0,
				},
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText(/→\s*0\.0%/)).toBeInTheDocument();
		});

		it("should show tooltip with historical change details", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 80,
				linesTotal: 100,
				coverage: 80,
				historicalCoverage: {
					coverage: 70,
					change: 10,
				},
			};

			renderWithRouter(<CoverageTree node={node} />);
			const indicator = screen.getByText(/↑\s*10\.0%/);
			expect(indicator).toHaveAttribute("title", "+10.0% vs historical");
		});
	});

	describe("Edge Cases", () => {
		it("should handle missing path gracefully", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("file.ts")).toBeInTheDocument();
		});

		it("should handle undefined coverage", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 0,
				linesTotal: 0,
			};

			renderWithRouter(<CoverageTree node={node} />);
			// Should not show coverage badge
			expect(screen.queryByText(/\d+\.\d+%/)).not.toBeInTheDocument();
		});

		it("should handle statement coverage when linesTotal is 0", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 0,
				linesTotal: 0,
				statementsCovered: 10,
				statementsTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} useStatementCoverage={true} />);
			expect(screen.getByText("10/20")).toBeInTheDocument();
		});

		it("should handle directory with aggregated coverage", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				linesCovered: 50,
				linesTotal: 100,
				coverage: 50,
				children: [
					{
						name: "file1.ts",
						path: "src/file1.ts",
						type: "file",
						linesCovered: 30,
						linesTotal: 60,
						coverage: 50,
					},
					{
						name: "file2.ts",
						path: "src/file2.ts",
						type: "file",
						linesCovered: 20,
						linesTotal: 40,
						coverage: 50,
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("50.0%")).toBeInTheDocument();
			expect(screen.getByText("50/100")).toBeInTheDocument();
		});

		it("should handle nested directories with different coverage levels", () => {
			const node: TreeNode = {
				name: "src",
				path: "src",
				type: "directory",
				children: [
					{
						name: "high",
						path: "src/high",
						type: "directory",
						linesCovered: 90,
						linesTotal: 100,
						coverage: 90,
						children: [
							{
								name: "file.ts",
								path: "src/high/file.ts",
								type: "file",
								linesCovered: 90,
								linesTotal: 100,
								coverage: 90,
							},
						],
					},
					{
						name: "low",
						path: "src/low",
						type: "directory",
						linesCovered: 20,
						linesTotal: 100,
						coverage: 20,
						children: [
							{
								name: "file.ts",
								path: "src/low/file.ts",
								type: "file",
								linesCovered: 20,
								linesTotal: 100,
								coverage: 20,
							},
						],
					},
				],
			};

			renderWithRouter(<CoverageTree node={node} />);
			expect(screen.getByText("src")).toBeInTheDocument();
			expect(screen.getByText("high")).toBeInTheDocument();
			expect(screen.getByText("low")).toBeInTheDocument();
		});
	});

	describe("Indentation", () => {
		it("should apply correct indentation based on level", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "src/file.ts",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} level={2} />);
			const container = screen.getByText("file.ts").closest("div");
			expect(container).toHaveStyle({ paddingLeft: expect.stringContaining("56px") }); // 2 * 24 + 8
		});

		it("should handle level 0 indentation", () => {
			const node: TreeNode = {
				name: "file.ts",
				path: "file.ts",
				type: "file",
				linesCovered: 10,
				linesTotal: 20,
				coverage: 50,
			};

			renderWithRouter(<CoverageTree node={node} level={0} />);
			const container = screen.getByText("file.ts").closest("div");
			expect(container).toHaveStyle({ paddingLeft: expect.stringContaining("8px") });
		});
	});
});
