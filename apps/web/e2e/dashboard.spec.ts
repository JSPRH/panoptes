import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
	test("should load the dashboard page", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/Panoptes/);
	});

	test("should display page header", async ({ page }) => {
		await page.goto("/");
		// Check for dashboard header text
		const header = page.getByRole("heading", { name: /dashboard/i });
		await expect(header).toBeVisible();
	});

	test("should have navigation links", async ({ page }) => {
		await page.goto("/");
		// Check for navigation elements - these should be visible in the layout
		const nav = page.locator("nav");
		await expect(nav).toBeVisible();
	});
});
