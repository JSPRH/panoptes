import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
	test("should load the dashboard page", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/Panoptes/);
	});

	test("should display page header", async ({ page }) => {
		await page.goto("/dashboard");
		const header = page.getByRole("heading", { name: /dashboard/i });
		await expect(header).toBeVisible();
	});

	// Skip navigation test - nav visibility depends on viewport size and responsive design
	// Navigation functionality is tested through navigation.spec.ts
	test.skip("should have navigation links", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Navigation is in an aside (desktop) or header (mobile)
		// Look for either the aside sidebar or header with nav
		const nav = page.locator("aside nav, header nav").first();
		await expect(nav).toBeVisible({ timeout: 5000 });
	});
});
