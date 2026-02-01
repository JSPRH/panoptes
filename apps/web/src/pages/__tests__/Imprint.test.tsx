import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Imprint from "../Imprint";

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, initialEntries = ["/imprint"]) => {
	return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
};

describe("Imprint Page", () => {
	it("should render the page header with correct title and description", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Imprint")).toBeInTheDocument();
		expect(screen.getByText("Legal information")).toBeInTheDocument();
	});

	it("should render main section heading", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Information according to § 5 TMG")).toBeInTheDocument();
	});

	it("should render company information with placeholders", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText(/Panoptes/)).toBeInTheDocument();
		expect(screen.getByText(/\[Company Name\]/)).toBeInTheDocument();
		expect(screen.getByText(/\[Street Address\]/)).toBeInTheDocument();
		expect(screen.getByText(/\[Postal Code\] \[City\]/)).toBeInTheDocument();
		expect(screen.getByText(/\[Country\]/)).toBeInTheDocument();
	});

	it("should render contact section", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Contact")).toBeInTheDocument();
		expect(screen.getByText(/Phone: \[Phone Number\]/)).toBeInTheDocument();
		expect(screen.getByText(/Email: \[Email Address\]/)).toBeInTheDocument();
		expect(screen.getByText(/Website: \[Website URL\]/)).toBeInTheDocument();
	});

	it("should render responsible for content section", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText(/Responsible for content according to § 55 Abs. 2 RStV/)).toBeInTheDocument();
		expect(screen.getByText(/\[Name\]/)).toBeInTheDocument();
	});

	it("should render disclaimer section", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Disclaimer")).toBeInTheDocument();
	});

	it("should render liability for contents subsection", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Liability for Contents")).toBeInTheDocument();
		expect(screen.getByText(/The contents of our pages have been created with the greatest care/)).toBeInTheDocument();
		expect(screen.getByText(/As service providers, we are liable for our own contents/)).toBeInTheDocument();
		expect(screen.getByText(/German Telemedia Act \(TMG\)/)).toBeInTheDocument();
	});

	it("should render liability for links subsection", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Liability for Links")).toBeInTheDocument();
		expect(screen.getByText(/Our offer includes links to external third party websites/)).toBeInTheDocument();
		expect(screen.getByText(/We have no influence on the contents of those websites/)).toBeInTheDocument();
		expect(screen.getByText(/Illegal links will be removed immediately/)).toBeInTheDocument();
	});

	it("should render copyright subsection", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText("Copyright")).toBeInTheDocument();
		expect(screen.getByText(/Contents and compilations published on these websites/)).toBeInTheDocument();
		expect(screen.getByText(/subject to German copyright laws/)).toBeInTheDocument();
		expect(screen.getByText(/Downloads and copies of these websites are permitted for private use only/)).toBeInTheDocument();
		expect(screen.getByText(/The commercial use of our contents without permission/)).toBeInTheDocument();
	});

	it("should render navigation links", () => {
		renderWithRouter(<Imprint />);

		const backLink = screen.getByText("← Back to Homepage");
		const dashboardLink = screen.getByText("Go to Dashboard →");

		expect(backLink).toBeInTheDocument();
		expect(dashboardLink).toBeInTheDocument();
		expect(backLink.closest("a")).toHaveAttribute("href", "/");
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should navigate to homepage when back link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<Imprint />);

		const backLink = screen.getByText("← Back to Homepage");
		await user.click(backLink);

		expect(backLink.closest("a")).toHaveAttribute("href", "/");
	});

	it("should navigate to dashboard when dashboard link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<Imprint />);

		const dashboardLink = screen.getByText("Go to Dashboard →");
		await user.click(dashboardLink);

		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should render content within a Card component", () => {
		renderWithRouter(<Imprint />);

		const cardContent = screen.getByText("Information according to § 5 TMG").closest(".prose");
		expect(cardContent).toBeInTheDocument();
	});

	it("should render main heading with correct styling", () => {
		renderWithRouter(<Imprint />);

		const mainHeading = screen.getByText("Information according to § 5 TMG");
		expect(mainHeading).toHaveClass("font-heading", "text-2xl", "font-semibold");
	});

	it("should render section headings with correct styling", () => {
		renderWithRouter(<Imprint />);

		const contactHeading = screen.getByText("Contact");
		expect(contactHeading).toHaveClass("font-heading", "text-xl", "font-semibold");

		const disclaimerHeading = screen.getByText("Disclaimer");
		expect(disclaimerHeading).toHaveClass("font-heading", "text-xl", "font-semibold");
	});

	it("should render subsection headings with correct styling", () => {
		renderWithRouter(<Imprint />);

		const liabilityContentsHeading = screen.getByText("Liability for Contents");
		expect(liabilityContentsHeading).toHaveClass("font-semibold");

		const liabilityLinksHeading = screen.getByText("Liability for Links");
		expect(liabilityLinksHeading).toHaveClass("font-semibold");

		const copyrightHeading = screen.getByText("Copyright");
		expect(copyrightHeading).toHaveClass("font-semibold");
	});

	it("should render proper semantic HTML structure", () => {
		renderWithRouter(<Imprint />);

		const mainHeading = screen.getByRole("heading", { level: 1 });
		expect(mainHeading).toHaveTextContent("Imprint");

		const h2Headings = screen.getAllByRole("heading", { level: 2 });
		expect(h2Headings.length).toBeGreaterThanOrEqual(1);

		const h3Headings = screen.getAllByRole("heading", { level: 3 });
		expect(h3Headings.length).toBeGreaterThanOrEqual(3);

		const h4Headings = screen.getAllByRole("heading", { level: 4 });
		expect(h4Headings.length).toBeGreaterThanOrEqual(3);
	});

	it("should render links with proper accessibility attributes", () => {
		renderWithRouter(<Imprint />);

		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThanOrEqual(2);

		links.forEach((link) => {
			expect(link).toHaveAttribute("href");
		});
	});

	it("should render content with proper text styling classes", () => {
		renderWithRouter(<Imprint />);

		const contentContainer = screen.getByText("Information according to § 5 TMG").closest(".text-muted-foreground");
		expect(contentContainer).toBeInTheDocument();
	});

	it("should handle rendering with different router locations", () => {
		renderWithRouter(<Imprint />, ["/legal/imprint"]);

		expect(screen.getByText("Imprint")).toBeInTheDocument();
	});

	it("should render prose content with max-width-none class", () => {
		renderWithRouter(<Imprint />);

		const proseContainer = screen.getByText("Information according to § 5 TMG").closest(".prose");
		expect(proseContainer).toHaveClass("prose-sm", "max-w-none");
	});

	it("should render Card component with proper structure", () => {
		renderWithRouter(<Imprint />);

		const cardContent = screen.getByText("Information according to § 5 TMG").closest(".pt-6");
		expect(cardContent).toBeInTheDocument();
	});

	it("should render company name with strong styling", () => {
		renderWithRouter(<Imprint />);

		const panoptesText = screen.getByText("Panoptes");
		const strongElement = panoptesText.closest("strong");
		expect(strongElement).toBeInTheDocument();
		expect(strongElement).toHaveClass("text-foreground");
	});

	it("should render all disclaimer subsections in correct order", () => {
		renderWithRouter(<Imprint />);

		const h4Headings = screen.getAllByRole("heading", { level: 4 });
		const subsectionTitles = h4Headings.map((h) => h.textContent);

		expect(subsectionTitles).toContain("Liability for Contents");
		expect(subsectionTitles).toContain("Liability for Links");
		expect(subsectionTitles).toContain("Copyright");
	});

	it("should render TMG legal reference", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText(/§ 5 TMG/)).toBeInTheDocument();
		expect(screen.getByText(/§ 55 Abs. 2 RStV/)).toBeInTheDocument();
		expect(screen.getByText(/§ 7, paragraph 1 German Telemedia Act/)).toBeInTheDocument();
		expect(screen.getByText(/§§ 8 to 10 German Telemedia Act/)).toBeInTheDocument();
	});

	it("should render German legal text correctly", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText(/service providers are not under obligation to permanently monitor/)).toBeInTheDocument();
		expect(screen.getByText(/Legal obligations to remove information or to block the use of information/)).toBeInTheDocument();
	});

	it("should render copyright notice with German law reference", () => {
		renderWithRouter(<Imprint />);

		expect(screen.getByText(/subject to German copyright laws/)).toBeInTheDocument();
		expect(screen.getByText(/Reproduction, editing, distribution as well as the use of any kind/)).toBeInTheDocument();
		expect(screen.getByText(/outside the scope of the copyright law shall require the prior written consent/)).toBeInTheDocument();
	});

	it("should render content spacing correctly", () => {
		renderWithRouter(<Imprint />);

		const contentContainer = screen.getByText("Information according to § 5 TMG").closest(".space-y-4");
		expect(contentContainer).toBeInTheDocument();
	});

	it("should render contact information with line breaks", () => {
		renderWithRouter(<Imprint />);

		const contactSection = screen.getByText("Contact").closest("div");
		expect(contactSection).toBeInTheDocument();

		// Check that contact details are present
		expect(screen.getByText(/Phone:/)).toBeInTheDocument();
		expect(screen.getByText(/Email:/)).toBeInTheDocument();
		expect(screen.getByText(/Website:/)).toBeInTheDocument();
	});

	it("should render responsible person section with address placeholders", () => {
		renderWithRouter(<Imprint />);

		const responsibleSection = screen.getByText(/Responsible for content according to § 55 Abs. 2 RStV/);
		expect(responsibleSection).toBeInTheDocument();

		expect(screen.getByText(/\[Name\]/)).toBeInTheDocument();
		expect(screen.getByText(/\[Street Address\]/)).toBeInTheDocument();
	});

	it("should render all three disclaimer subsections", () => {
		renderWithRouter(<Imprint />);

		const disclaimerSection = screen.getByText("Disclaimer").closest("div");
		expect(disclaimerSection).toBeInTheDocument();

		// All three subsections should be within disclaimer
		expect(screen.getByText("Liability for Contents")).toBeInTheDocument();
		expect(screen.getByText("Liability for Links")).toBeInTheDocument();
		expect(screen.getByText("Copyright")).toBeInTheDocument();
	});

	it("should render proper text content structure", () => {
		renderWithRouter(<Imprint />);

		// Check that paragraphs are rendered
		const paragraphs = screen.getByText("Information according to § 5 TMG").closest(".prose")?.querySelectorAll("p");
		expect(paragraphs?.length).toBeGreaterThan(0);
	});

	it("should render company information section first", () => {
		renderWithRouter(<Imprint />);

		const mainHeading = screen.getByText("Information according to § 5 TMG");
		const panoptesText = screen.getByText("Panoptes");

		// Panoptes should appear after the main heading
		expect(mainHeading.compareDocumentPosition(panoptesText)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it("should render contact section after company information", () => {
		renderWithRouter(<Imprint />);

		const panoptesText = screen.getByText("Panoptes");
		const contactHeading = screen.getByText("Contact");

		expect(panoptesText.compareDocumentPosition(contactHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it("should render disclaimer section last", () => {
		renderWithRouter(<Imprint />);

		const contactHeading = screen.getByText("Contact");
		const disclaimerHeading = screen.getByText("Disclaimer");

		expect(contactHeading.compareDocumentPosition(disclaimerHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});
});
