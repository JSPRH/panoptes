import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../PageHeader";

describe("PageHeader Component", () => {
	it("should render title when provided", () => {
		render(<PageHeader title="Test Title" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Test Title");
	});

	it("should render description when provided", () => {
		render(<PageHeader title="Test Title" description="Test Description" />);

		expect(screen.getByText("Test Description")).toBeInTheDocument();
	});

	it("should not render description when not provided", () => {
		render(<PageHeader title="Test Title" />);

		const description = screen.queryByText("Test Description");
		expect(description).not.toBeInTheDocument();
	});

	it("should render title with correct styling classes", () => {
		render(<PageHeader title="Test Title" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveClass("text-3xl", "font-bold", "tracking-tight");
	});

	it("should render description with correct styling classes", () => {
		render(<PageHeader title="Test Title" description="Test Description" />);

		const description = screen.getByText("Test Description");
		expect(description).toHaveClass("text-muted-foreground");
	});

	it("should render container with correct spacing classes", () => {
		const { container } = render(<PageHeader title="Test Title" description="Test Description" />);

		const headerContainer = container.firstChild;
		expect(headerContainer).toHaveClass("space-y-1");
	});

	it("should handle empty string title", () => {
		render(<PageHeader title="" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("");
	});

	it("should handle empty string description", () => {
		render(<PageHeader title="Test Title" description="" />);

		const description = screen.queryByText("");
		// Empty string description should still render (but may not be visible)
		expect(description).toBeInTheDocument();
	});

	it("should handle long title text", () => {
		const longTitle = "A".repeat(200);
		render(<PageHeader title={longTitle} />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent(longTitle);
	});

	it("should handle long description text", () => {
		const longDescription = "A".repeat(500);
		render(<PageHeader title="Test Title" description={longDescription} />);

		expect(screen.getByText(longDescription)).toBeInTheDocument();
	});

	it("should handle special characters in title", () => {
		const specialTitle = "Test & Title < > \" '";
		render(<PageHeader title={specialTitle} />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent(specialTitle);
	});

	it("should handle special characters in description", () => {
		const specialDescription = "Test & Description < > \" '";
		render(<PageHeader title="Test Title" description={specialDescription} />);

		expect(screen.getByText(specialDescription)).toBeInTheDocument();
	});

	it("should handle unicode characters in title", () => {
		const unicodeTitle = "Test Title 测试 🎉";
		render(<PageHeader title={unicodeTitle} />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent(unicodeTitle);
	});

	it("should handle unicode characters in description", () => {
		const unicodeDescription = "Test Description 测试 🎉";
		render(<PageHeader title="Test Title" description={unicodeDescription} />);

		expect(screen.getByText(unicodeDescription)).toBeInTheDocument();
	});

	it("should render title as h1 element", () => {
		render(<PageHeader title="Test Title" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading.tagName).toBe("H1");
	});

	it("should render description as p element", () => {
		render(<PageHeader title="Test Title" description="Test Description" />);

		const description = screen.getByText("Test Description");
		expect(description.tagName).toBe("P");
	});

	it("should maintain proper spacing between title and description", () => {
		const { container } = render(<PageHeader title="Test Title" description="Test Description" />);

		const headerContainer = container.firstChild as HTMLElement;
		expect(headerContainer).toHaveClass("space-y-1");
	});

	it("should render multiple PageHeader instances independently", () => {
		render(
			<>
				<PageHeader title="First Title" description="First Description" />
				<PageHeader title="Second Title" description="Second Description" />
			</>
		);

		expect(screen.getByText("First Title")).toBeInTheDocument();
		expect(screen.getByText("First Description")).toBeInTheDocument();
		expect(screen.getByText("Second Title")).toBeInTheDocument();
		expect(screen.getByText("Second Description")).toBeInTheDocument();
	});

	it("should handle numeric title", () => {
		render(<PageHeader title="123" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("123");
	});

	it("should handle numeric description", () => {
		render(<PageHeader title="Test Title" description="123" />);

		expect(screen.getByText("123")).toBeInTheDocument();
	});

	it("should render with only title prop", () => {
		render(<PageHeader title="Title Only" />);

		expect(screen.getByText("Title Only")).toBeInTheDocument();
		const description = screen.queryByText(/./);
		// Should only have title, no description
		expect(description?.textContent).not.toContain("Description");
	});

	it("should render description conditionally based on prop", () => {
		const { rerender } = render(<PageHeader title="Test Title" />);

		expect(screen.queryByText("Test Description")).not.toBeInTheDocument();

		rerender(<PageHeader title="Test Title" description="Test Description" />);

		expect(screen.getByText("Test Description")).toBeInTheDocument();

		rerender(<PageHeader title="Test Title" />);

		expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
	});

	it("should have proper semantic structure", () => {
		render(<PageHeader title="Test Title" description="Test Description" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();

		const description = screen.getByText("Test Description");
		expect(description).toBeInTheDocument();
		expect(description.tagName).toBe("P");
	});

	it("should handle whitespace in title", () => {
		render(<PageHeader title="  Test   Title  " />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("  Test   Title  ");
	});

	it("should handle whitespace in description", () => {
		render(<PageHeader title="Test Title" description="  Test   Description  " />);

		expect(screen.getByText("  Test   Description  ")).toBeInTheDocument();
	});

	it("should render with HTML entities in title", () => {
		render(<PageHeader title="Test & Title" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Test & Title");
	});

	it("should render with HTML entities in description", () => {
		render(<PageHeader title="Test Title" description="Test & Description" />);

		expect(screen.getByText("Test & Description")).toBeInTheDocument();
	});

	it("should maintain accessibility with proper heading hierarchy", () => {
		render(<PageHeader title="Test Title" description="Test Description" />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Test Title");
	});

	it("should render description as sibling to title", () => {
		const { container } = render(<PageHeader title="Test Title" description="Test Description" />);

		const headerContainer = container.firstChild as HTMLElement;
		const title = headerContainer.querySelector("h1");
		const description = headerContainer.querySelector("p");

		expect(title).toBeInTheDocument();
		expect(description).toBeInTheDocument();
		expect(title?.nextSibling).toBe(description);
	});
});
