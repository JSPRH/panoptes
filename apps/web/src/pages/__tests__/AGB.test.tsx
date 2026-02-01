import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AGB from "../AGB";

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, initialEntries = ["/agb"]) => {
	return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
};

describe("AGB (Terms and Conditions) Page", () => {
	it("should render the page header with correct title and description", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText("Terms and Conditions")).toBeInTheDocument();
		expect(screen.getByText("Allgemeine Geschäftsbedingungen (AGB)")).toBeInTheDocument();
	});

	it("should render all main sections of the terms", () => {
		renderWithRouter(<AGB />);

		// Check for all main section headings
		expect(screen.getByText("1. Scope of Application")).toBeInTheDocument();
		expect(screen.getByText("2. Description of Service")).toBeInTheDocument();
		expect(screen.getByText("3. User Accounts and Registration")).toBeInTheDocument();
		expect(screen.getByText("4. Acceptable Use")).toBeInTheDocument();
		expect(screen.getByText("5. Data and Privacy")).toBeInTheDocument();
		expect(screen.getByText("6. Intellectual Property")).toBeInTheDocument();
		expect(screen.getByText("7. Limitation of Liability")).toBeInTheDocument();
		expect(screen.getByText("8. Service Availability")).toBeInTheDocument();
		expect(screen.getByText("9. Modifications to Terms")).toBeInTheDocument();
		expect(screen.getByText("10. Termination")).toBeInTheDocument();
		expect(screen.getByText("11. Governing Law")).toBeInTheDocument();
		expect(screen.getByText("12. Contact Information")).toBeInTheDocument();
	});

	it("should render content for each section", () => {
		renderWithRouter(<AGB />);

		// Check for key content phrases
		expect(screen.getByText(/These Terms and Conditions/)).toBeInTheDocument();
		expect(screen.getByText(/Panoptes is a platform/)).toBeInTheDocument();
		expect(screen.getByText(/You agree not to:/)).toBeInTheDocument();
		expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument();
	});

	it("should render the acceptable use list items", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/Use the Service for any illegal purpose/)).toBeInTheDocument();
		expect(screen.getByText(/Transmit any harmful code/)).toBeInTheDocument();
		expect(screen.getByText(/Attempt to gain unauthorized access/)).toBeInTheDocument();
		expect(screen.getByText(/Interfere with or disrupt the Service/)).toBeInTheDocument();
		expect(screen.getByText(/Use the Service to violate the rights of others/)).toBeInTheDocument();
		expect(screen.getByText(/Reverse engineer, decompile/)).toBeInTheDocument();
	});

	it("should render navigation links", () => {
		renderWithRouter(<AGB />);

		const backLink = screen.getByText("← Back to Homepage");
		const dashboardLink = screen.getByText("Go to Dashboard →");

		expect(backLink).toBeInTheDocument();
		expect(dashboardLink).toBeInTheDocument();
		expect(backLink.closest("a")).toHaveAttribute("href", "/");
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should navigate to homepage when back link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<AGB />);

		const backLink = screen.getByText("← Back to Homepage");
		await user.click(backLink);

		// Link should have correct href
		expect(backLink.closest("a")).toHaveAttribute("href", "/");
	});

	it("should navigate to dashboard when dashboard link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<AGB />);

		const dashboardLink = screen.getByText("Go to Dashboard →");
		await user.click(dashboardLink);

		// Link should have correct href
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should render last updated date", () => {
		renderWithRouter(<AGB />);

		const lastUpdated = screen.getByText(/Last Updated:/);
		expect(lastUpdated).toBeInTheDocument();

		// Check that date is rendered (format may vary by locale)
		const dateText = lastUpdated.textContent || "";
		expect(dateText).toContain("Last Updated:");
	});

	it("should render content within a Card component", () => {
		renderWithRouter(<AGB />);

		// Card should be present (Card component renders a div with specific classes)
		const cardContent = screen.getByText("1. Scope of Application").closest(".prose");
		expect(cardContent).toBeInTheDocument();
	});

	it("should render all section headings with correct styling classes", () => {
		renderWithRouter(<AGB />);

		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.length).toBeGreaterThanOrEqual(12);

		// Check that headings have the expected classes
		headings.forEach((heading) => {
			expect(heading).toHaveClass("font-heading", "text-2xl", "font-semibold");
		});
	});

	it("should render contact information section with placeholders", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/Email: \[Email Address\]/)).toBeInTheDocument();
		expect(screen.getByText(/Address: \[Company Address\]/)).toBeInTheDocument();
	});

	it("should render service description mentioning Panoptes", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/Panoptes is a platform that ingests test results/)).toBeInTheDocument();
		expect(screen.getByText(/visualization tools, analytics/)).toBeInTheDocument();
	});

	it("should render privacy policy reference in Data and Privacy section", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/Your use of the Service is also governed by our Privacy Policy/)).toBeInTheDocument();
	});

	it("should render limitation of liability text", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/To the maximum extent permitted by law/)).toBeInTheDocument();
		expect(screen.getByText(/indirect, incidental, special, consequential/)).toBeInTheDocument();
	});

	it("should render service availability disclaimer", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/The Service is provided "as is" and "as available"/)).toBeInTheDocument();
		expect(screen.getByText(/without warranties of any kind/)).toBeInTheDocument();
	});

	it("should render modification clause", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/The Provider reserves the right to modify these Terms/)).toBeInTheDocument();
		expect(screen.getByText(/Your continued use of the Service after such modifications/)).toBeInTheDocument();
	});

	it("should render termination clause", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/The Provider may terminate or suspend your access/)).toBeInTheDocument();
		expect(screen.getByText(/Upon termination, your right to use the Service will cease/)).toBeInTheDocument();
	});

	it("should render governing law section with jurisdiction placeholder", () => {
		renderWithRouter(<AGB />);

		expect(screen.getByText(/These Terms and Conditions shall be governed by/)).toBeInTheDocument();
		expect(screen.getByText(/\[Jurisdiction\]/)).toBeInTheDocument();
	});

	it("should have proper semantic HTML structure", () => {
		renderWithRouter(<AGB />);

		// Check for main heading
		const mainHeading = screen.getByRole("heading", { level: 1 });
		expect(mainHeading).toHaveTextContent("Terms and Conditions");

		// Check for section headings
		const sectionHeadings = screen.getAllByRole("heading", { level: 2 });
		expect(sectionHeadings.length).toBeGreaterThanOrEqual(12);
	});

	it("should render links with proper accessibility attributes", () => {
		renderWithRouter(<AGB />);

		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThanOrEqual(2);

		links.forEach((link) => {
			expect(link).toHaveAttribute("href");
		});
	});

	it("should render content with proper text styling classes", () => {
		renderWithRouter(<AGB />);

		// Check that muted text is used for content
		const contentContainer = screen.getByText("1. Scope of Application").closest(".text-muted-foreground");
		expect(contentContainer).toBeInTheDocument();
	});

	it("should render last updated section with border separator", () => {
		renderWithRouter(<AGB />);

		const lastUpdatedSection = screen.getByText(/Last Updated:/).closest("div");
		expect(lastUpdatedSection?.parentElement).toHaveClass("border-t", "border-border");
	});

	it("should handle rendering with different router locations", () => {
		renderWithRouter(<AGB />, ["/legal/agb"]);

		expect(screen.getByText("Terms and Conditions")).toBeInTheDocument();
	});

	it("should render all 12 sections in correct order", () => {
		renderWithRouter(<AGB />);

		const headings = screen.getAllByRole("heading", { level: 2 });
		const sectionTitles = headings.map((h) => h.textContent);

		expect(sectionTitles[0]).toBe("1. Scope of Application");
		expect(sectionTitles[1]).toBe("2. Description of Service");
		expect(sectionTitles[2]).toBe("3. User Accounts and Registration");
		expect(sectionTitles[3]).toBe("4. Acceptable Use");
		expect(sectionTitles[4]).toBe("5. Data and Privacy");
		expect(sectionTitles[5]).toBe("6. Intellectual Property");
		expect(sectionTitles[6]).toBe("7. Limitation of Liability");
		expect(sectionTitles[7]).toBe("8. Service Availability");
		expect(sectionTitles[8]).toBe("9. Modifications to Terms");
		expect(sectionTitles[9]).toBe("10. Termination");
		expect(sectionTitles[10]).toBe("11. Governing Law");
		expect(sectionTitles[11]).toBe("12. Contact Information");
	});

	it("should render prose content with max-width-none class", () => {
		renderWithRouter(<AGB />);

		const proseContainer = screen.getByText("1. Scope of Application").closest(".prose");
		expect(proseContainer).toHaveClass("prose-sm", "max-w-none");
	});

	it("should render Card component with proper structure", () => {
		renderWithRouter(<AGB />);

		// CardContent should have pt-6 class
		const cardContent = screen.getByText("1. Scope of Application").closest(".pt-6");
		expect(cardContent).toBeInTheDocument();
	});
});
