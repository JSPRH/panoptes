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

	test("should have navigation links", async ({ page }) => {
		// Ensure viewport is large enough for desktop navigation (lg breakpoint is 1024px)
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Navigation is in an aside (desktop) or header (mobile)
		// On desktop (lg+), the aside nav should be visible (aside has "hidden lg:flex")
		// On mobile, the header nav should be visible (header has "lg:hidden")
		// Wait for the aside to be visible first (ensures CSS has loaded)
		const aside = page.locator("aside");
		await expect(aside).toBeVisible({ timeout: 5000 });
		// Then check the nav inside the aside
		const nav = page.locator("aside nav");
		await expect(nav).toBeVisible({ timeout: 5000 });
	});
});
