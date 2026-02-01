// This file contains Playwright e2e tests
// It is skipped when running with bun test - use `bun run test:e2e` to run these tests

// @ts-ignore - Check if running with bun test
if (typeof Bun === "undefined") {
	// Only execute when NOT running with bun test (i.e., with Playwright)
	const setupTests = async () => {
		const { expect, test } = await import("@playwright/test");

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
				await page.goto("/dashboard");
				const nav = page.locator("nav").first();
				await expect(nav).toBeVisible();
			});
		});
	};

	setupTests();
}
