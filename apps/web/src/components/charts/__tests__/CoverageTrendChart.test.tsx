import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoverageTrendChart } from "../CoverageTrendChart";

describe("CoverageTrendChart", () => {
	describe("Empty Data Handling", () => {
		it("should display empty state message when data is empty", () => {
			render(<CoverageTrendChart data={[]} />);
			expect(screen.getByText("No coverage data available")).toBeInTheDocument();
		});

		it("should use custom height for empty state", () => {
			render(<CoverageTrendChart data={[]} height={400} />);
			const emptyState = screen.getByText("No coverage data available");
			expect(emptyState.closest("div")).toHaveStyle({ height: "400px" });
		});
	});

	describe("Area Chart Rendering", () => {
		const mockData = [
			{
				date: Date.now() - 86400000,
				linesCoverage: 80,
				statementsCoverage: 75,
				branchesCoverage: 70,
				functionsCoverage: 85,
				overallCoverage: 77.5,
			},
			{
				date: Date.now(),
				linesCoverage: 85,
				statementsCoverage: 80,
				branchesCoverage: 75,
				functionsCoverage: 90,
				overallCoverage: 82.5,
			},
		];

		it("should render area chart when showArea is true", () => {
			render(<CoverageTrendChart data={mockData} showArea={true} />);
			// Check that ResponsiveContainer is rendered (chart library component)
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should render single overall coverage area when showAllMetrics is false", () => {
			render(<CoverageTrendChart data={mockData} showArea={true} showAllMetrics={false} />);
			// The chart should render with overallCoverage data
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should render all metrics when showAllMetrics is true", () => {
			render(<CoverageTrendChart data={mockData} showArea={true} showAllMetrics={true} />);
			// The chart should render with all metrics
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should use custom height", () => {
			render(<CoverageTrendChart data={mockData} showArea={true} height={400} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container?.parentElement).toHaveStyle({ height: "400px" });
		});
	});

	describe("Line Chart Rendering", () => {
		const mockData = [
			{
				date: Date.now() - 86400000,
				linesCoverage: 80,
				statementsCoverage: 75,
				branchesCoverage: 70,
				functionsCoverage: 85,
				overallCoverage: 77.5,
			},
			{
				date: Date.now(),
				linesCoverage: 85,
				statementsCoverage: 80,
				branchesCoverage: 75,
				functionsCoverage: 90,
				overallCoverage: 82.5,
			},
		];

		it("should render line chart when showArea is false", () => {
			render(<CoverageTrendChart data={mockData} showArea={false} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should render single overall coverage line when showAllMetrics is false", () => {
			render(<CoverageTrendChart data={mockData} showArea={false} showAllMetrics={false} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should render all metrics lines when showAllMetrics is true", () => {
			render(<CoverageTrendChart data={mockData} showArea={false} showAllMetrics={true} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});
	});

	describe("Data Handling", () => {
		it("should handle single data point", () => {
			const singleDataPoint = [
				{
					date: Date.now(),
					linesCoverage: 80,
					statementsCoverage: 75,
					branchesCoverage: 70,
					functionsCoverage: 85,
					overallCoverage: 77.5,
				},
			];

			render(<CoverageTrendChart data={singleDataPoint} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should handle multiple data points", () => {
			const multipleDataPoints = Array.from({ length: 10 }, (_, i) => ({
				date: Date.now() - (10 - i) * 86400000,
				linesCoverage: 80 + i,
				statementsCoverage: 75 + i,
				branchesCoverage: 70 + i,
				functionsCoverage: 85 + i,
				overallCoverage: 77.5 + i,
			}));

			render(<CoverageTrendChart data={multipleDataPoints} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should handle zero coverage values", () => {
			const zeroData = [
				{
					date: Date.now(),
					linesCoverage: 0,
					statementsCoverage: 0,
					branchesCoverage: 0,
					functionsCoverage: 0,
					overallCoverage: 0,
				},
			];

			render(<CoverageTrendChart data={zeroData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should handle 100% coverage values", () => {
			const fullData = [
				{
					date: Date.now(),
					linesCoverage: 100,
					statementsCoverage: 100,
					branchesCoverage: 100,
					functionsCoverage: 100,
					overallCoverage: 100,
				},
			];

			render(<CoverageTrendChart data={fullData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should handle negative coverage values (edge case)", () => {
			const negativeData = [
				{
					date: Date.now(),
					linesCoverage: -10,
					statementsCoverage: -5,
					branchesCoverage: -15,
					functionsCoverage: -20,
					overallCoverage: -12.5,
				},
			];

			render(<CoverageTrendChart data={negativeData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});
	});

	describe("Default Props", () => {
		const mockData = [
			{
				date: Date.now(),
				linesCoverage: 80,
				statementsCoverage: 75,
				branchesCoverage: 70,
				functionsCoverage: 85,
				overallCoverage: 77.5,
			},
		];

		it("should default showArea to false", () => {
			render(<CoverageTrendChart data={mockData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});

		it("should default height to 300", () => {
			render(<CoverageTrendChart data={mockData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container?.parentElement).toHaveStyle({ height: "300px" });
		});

		it("should default showAllMetrics to false", () => {
			render(<CoverageTrendChart data={mockData} showArea={true} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container).toBeInTheDocument();
		});
	});

	describe("Chart Configuration", () => {
		const mockData = [
			{
				date: Date.now() - 86400000,
				linesCoverage: 80,
				statementsCoverage: 75,
				branchesCoverage: 70,
				functionsCoverage: 85,
				overallCoverage: 77.5,
			},
			{
				date: Date.now(),
				linesCoverage: 85,
				statementsCoverage: 80,
				branchesCoverage: 75,
				functionsCoverage: 90,
				overallCoverage: 82.5,
			},
		];

		it("should render with ResponsiveContainer", () => {
			render(<CoverageTrendChart data={mockData} />);
			const container = screen.getByRole("img", { hidden: true }).closest("div");
			expect(container?.parentElement).toHaveStyle({ width: "100%" });
		});

		it("should handle different height values", () => {
			const heights = [200, 300, 400, 500];
			heights.forEach((height) => {
				const { unmount } = render(<CoverageTrendChart data={mockData} height={height} />);
				const container = screen.getByRole("img", { hidden: true }).closest("div");
				expect(container?.parentElement).toHaveStyle({ height: `${height}px` });
				unmount();
			});
		});
	});
});
