import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Privacy from "../Privacy";

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, initialEntries = ["/privacy"]) => {
	return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
};

describe("Privacy Policy Page", () => {
	it("should render the page header with correct title and description", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
		expect(screen.getByText("Data Privacy Declaration")).toBeInTheDocument();
	});

	it("should render all main sections of the privacy policy", () => {
		renderWithRouter(<Privacy />);

		// Check for all main section headings
		expect(screen.getByText("1. Introduction")).toBeInTheDocument();
		expect(screen.getByText("2. Information We Collect")).toBeInTheDocument();
		expect(screen.getByText("3. How We Use Your Information")).toBeInTheDocument();
		expect(screen.getByText("4. Data Sharing and Disclosure")).toBeInTheDocument();
		expect(screen.getByText("5. Data Storage and Security")).toBeInTheDocument();
		expect(screen.getByText("6. Your Rights and Choices")).toBeInTheDocument();
		expect(screen.getByText("7. Cookies and Tracking Technologies")).toBeInTheDocument();
		expect(screen.getByText("8. Data Retention")).toBeInTheDocument();
		expect(screen.getByText("9. International Data Transfers")).toBeInTheDocument();
		expect(screen.getByText("10. Children's Privacy")).toBeInTheDocument();
		expect(screen.getByText("11. Changes to This Privacy Policy")).toBeInTheDocument();
		expect(screen.getByText("12. Contact Us")).toBeInTheDocument();
	});

	it("should render subsection headings for Information We Collect", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText("2.1 Information You Provide")).toBeInTheDocument();
		expect(screen.getByText("2.2 Automatically Collected Information")).toBeInTheDocument();
	});

	it("should render list of information collected from users", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Account registration information/)).toBeInTheDocument();
		expect(screen.getByText(/Test results and test execution data/)).toBeInTheDocument();
		expect(screen.getByText(/Project and repository information/)).toBeInTheDocument();
		expect(screen.getByText(/CI\/CD workflow data/)).toBeInTheDocument();
		expect(screen.getByText(/Communication data when you contact us/)).toBeInTheDocument();
	});

	it("should render list of automatically collected information", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Usage data and analytics/)).toBeInTheDocument();
		expect(screen.getByText(/Device information and browser type/)).toBeInTheDocument();
		expect(screen.getByText(/IP address and location data/)).toBeInTheDocument();
		expect(screen.getByText(/Cookies and similar tracking technologies/)).toBeInTheDocument();
		expect(screen.getByText(/Log files and error reports/)).toBeInTheDocument();
	});

	it("should render how information is used", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/To provide, maintain, and improve the Service/)).toBeInTheDocument();
		expect(screen.getByText(/To process and visualize your test results/)).toBeInTheDocument();
		expect(screen.getByText(/To generate insights and analytics/)).toBeInTheDocument();
		expect(screen.getByText(/To communicate with you about the Service/)).toBeInTheDocument();
		expect(screen.getByText(/To detect and prevent fraud/)).toBeInTheDocument();
		expect(screen.getByText(/To comply with legal obligations/)).toBeInTheDocument();
		expect(screen.getByText(/To develop new features and services/)).toBeInTheDocument();
	});

	it("should render data sharing scenarios", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument();
		expect(screen.getByText(/Service Providers:/)).toBeInTheDocument();
		expect(screen.getByText(/Legal Requirements:/)).toBeInTheDocument();
		expect(screen.getByText(/Business Transfers:/)).toBeInTheDocument();
		expect(screen.getByText(/With Your Consent:/)).toBeInTheDocument();
	});

	it("should render user rights section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Access:/)).toBeInTheDocument();
		expect(screen.getByText(/Correction:/)).toBeInTheDocument();
		expect(screen.getByText(/Deletion:/)).toBeInTheDocument();
		expect(screen.getByText(/Portability:/)).toBeInTheDocument();
		expect(screen.getByText(/Objection:/)).toBeInTheDocument();
		expect(screen.getByText(/Restriction:/)).toBeInTheDocument();
	});

	it("should render user rights descriptions", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Request access to your personal information/)).toBeInTheDocument();
		expect(screen.getByText(/Request correction of inaccurate information/)).toBeInTheDocument();
		expect(screen.getByText(/Request deletion of your personal information/)).toBeInTheDocument();
		expect(screen.getByText(/Request transfer of your data to another service/)).toBeInTheDocument();
		expect(screen.getByText(/Object to processing of your information/)).toBeInTheDocument();
		expect(screen.getByText(/Request restriction of processing/)).toBeInTheDocument();
	});

	it("should render cookies and tracking section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/We use cookies and similar tracking technologies/)).toBeInTheDocument();
		expect(screen.getByText(/You can instruct your browser to refuse all cookies/)).toBeInTheDocument();
		expect(screen.getByText(/if you do not accept cookies, you may not be able to use some portions/)).toBeInTheDocument();
	});

	it("should render data retention information", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/We retain your personal information for as long as necessary/)).toBeInTheDocument();
		expect(screen.getByText(/When we no longer need your information, we will securely delete/)).toBeInTheDocument();
	});

	it("should render international data transfers section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Your information may be transferred to and processed in countries/)).toBeInTheDocument();
		expect(screen.getByText(/We take appropriate safeguards to ensure your information/)).toBeInTheDocument();
	});

	it("should render children's privacy section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/Our Service is not intended for children under the age of 13/)).toBeInTheDocument();
		expect(screen.getByText(/We do not knowingly collect personal information from children/)).toBeInTheDocument();
		expect(screen.getByText(/If you believe we have collected information from a child/)).toBeInTheDocument();
	});

	it("should render changes to privacy policy section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
		expect(screen.getByText(/We will notify you of any changes by posting the new Privacy Policy/)).toBeInTheDocument();
		expect(screen.getByText(/You are advised to review this Privacy Policy periodically/)).toBeInTheDocument();
	});

	it("should render contact information section", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
		expect(screen.getByText(/Email: \[Email Address\]/)).toBeInTheDocument();
		expect(screen.getByText(/Address: \[Company Address\]/)).toBeInTheDocument();
		expect(screen.getByText(/Data Protection Officer: \[DPO Contact Information\]/)).toBeInTheDocument();
	});

	it("should render navigation links", () => {
		renderWithRouter(<Privacy />);

		const backLink = screen.getByText("← Back to Homepage");
		const dashboardLink = screen.getByText("Go to Dashboard →");

		expect(backLink).toBeInTheDocument();
		expect(dashboardLink).toBeInTheDocument();
		expect(backLink.closest("a")).toHaveAttribute("href", "/");
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should navigate to homepage when back link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<Privacy />);

		const backLink = screen.getByText("← Back to Homepage");
		await user.click(backLink);

		expect(backLink.closest("a")).toHaveAttribute("href", "/");
	});

	it("should navigate to dashboard when dashboard link is clicked", async () => {
		const user = userEvent.setup();
		renderWithRouter(<Privacy />);

		const dashboardLink = screen.getByText("Go to Dashboard →");
		await user.click(dashboardLink);

		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
	});

	it("should render last updated date", () => {
		renderWithRouter(<Privacy />);

		const lastUpdated = screen.getByText(/Last Updated:/);
		expect(lastUpdated).toBeInTheDocument();

		const dateText = lastUpdated.textContent || "";
		expect(dateText).toContain("Last Updated:");
	});

	it("should render content within a Card component", () => {
		renderWithRouter(<Privacy />);

		const cardContent = screen.getByText("1. Introduction").closest(".prose");
		expect(cardContent).toBeInTheDocument();
	});

	it("should render all section headings with correct styling", () => {
		renderWithRouter(<Privacy />);

		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.length).toBeGreaterThanOrEqual(12);

		headings.forEach((heading) => {
			expect(heading).toHaveClass("font-heading", "text-2xl", "font-semibold");
		});
	});

	it("should render subsection headings with correct styling", () => {
		renderWithRouter(<Privacy />);

		const subsectionHeadings = screen.getAllByRole("heading", { level: 3 });
		expect(subsectionHeadings.length).toBeGreaterThanOrEqual(2);

		subsectionHeadings.forEach((heading) => {
			expect(heading).toHaveClass("font-semibold");
		});
	});

	it("should render strong text for emphasis in data sharing section", () => {
		renderWithRouter(<Privacy />);

		const strongElements = screen.getAllByText(/Service Providers:|Legal Requirements:|Business Transfers:|With Your Consent:/);
		expect(strongElements.length).toBeGreaterThanOrEqual(4);
	});

	it("should render reference to Section 9 in user rights", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/To exercise these rights, please contact us using the information provided in Section 9/)).toBeInTheDocument();
	});

	it("should render proper semantic HTML structure", () => {
		renderWithRouter(<Privacy />);

		const mainHeading = screen.getByRole("heading", { level: 1 });
		expect(mainHeading).toHaveTextContent("Privacy Policy");

		const sectionHeadings = screen.getAllByRole("heading", { level: 2 });
		expect(sectionHeadings.length).toBeGreaterThanOrEqual(12);
	});

	it("should render links with proper accessibility attributes", () => {
		renderWithRouter(<Privacy />);

		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThanOrEqual(2);

		links.forEach((link) => {
			expect(link).toHaveAttribute("href");
		});
	});

	it("should render content with proper text styling classes", () => {
		renderWithRouter(<Privacy />);

		const contentContainer = screen.getByText("1. Introduction").closest(".text-muted-foreground");
		expect(contentContainer).toBeInTheDocument();
	});

	it("should render last updated section with border separator", () => {
		renderWithRouter(<Privacy />);

		const lastUpdatedSection = screen.getByText(/Last Updated:/).closest("div");
		expect(lastUpdatedSection?.parentElement).toHaveClass("border-t", "border-border");
	});

	it("should handle rendering with different router locations", () => {
		renderWithRouter(<Privacy />, ["/legal/privacy"]);

		expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
	});

	it("should render all 12 sections in correct order", () => {
		renderWithRouter(<Privacy />);

		const headings = screen.getAllByRole("heading", { level: 2 });
		const sectionTitles = headings.map((h) => h.textContent);

		expect(sectionTitles[0]).toBe("1. Introduction");
		expect(sectionTitles[1]).toBe("2. Information We Collect");
		expect(sectionTitles[2]).toBe("3. How We Use Your Information");
		expect(sectionTitles[3]).toBe("4. Data Sharing and Disclosure");
		expect(sectionTitles[4]).toBe("5. Data Storage and Security");
		expect(sectionTitles[5]).toBe("6. Your Rights and Choices");
		expect(sectionTitles[6]).toBe("7. Cookies and Tracking Technologies");
		expect(sectionTitles[7]).toBe("8. Data Retention");
		expect(sectionTitles[8]).toBe("9. International Data Transfers");
		expect(sectionTitles[9]).toBe("10. Children's Privacy");
		expect(sectionTitles[10]).toBe("11. Changes to This Privacy Policy");
		expect(sectionTitles[11]).toBe("12. Contact Us");
	});

	it("should render prose content with max-width-none class", () => {
		renderWithRouter(<Privacy />);

		const proseContainer = screen.getByText("1. Introduction").closest(".prose");
		expect(proseContainer).toHaveClass("prose-sm", "max-w-none");
	});

	it("should render Card component with proper structure", () => {
		renderWithRouter(<Privacy />);

		const cardContent = screen.getByText("1. Introduction").closest(".pt-6");
		expect(cardContent).toBeInTheDocument();
	});

	it("should render list items with proper structure", () => {
		renderWithRouter(<Privacy />);

		const lists = screen.getAllByRole("list");
		expect(lists.length).toBeGreaterThan(0);

		lists.forEach((list) => {
			expect(list).toHaveClass("list-disc", "pl-6");
		});
	});

	it("should render introduction mentioning Panoptes", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/This Privacy Policy explains how Panoptes/)).toBeInTheDocument();
		expect(screen.getByText(/test visualization platform/)).toBeInTheDocument();
	});

	it("should render data storage security information", () => {
		renderWithRouter(<Privacy />);

		expect(screen.getByText(/We implement appropriate technical and organizational measures/)).toBeInTheDocument();
		expect(screen.getByText(/no method of transmission over the Internet or electronic storage is 100% secure/)).toBeInTheDocument();
	});
});
