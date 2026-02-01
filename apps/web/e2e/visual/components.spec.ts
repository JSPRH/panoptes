import { expect, test } from "@playwright/test";

test.describe("Visual Tests - Components", () => {
	test("navigation header visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Capture just the header/navigation area
		const header = page.locator("header").first();
		await expect(header).toHaveScreenshot("navigation-header.png");
	});

	test("empty state component visual regression", async ({ page }) => {
		// Navigate to a page that might show empty state
		// Or create a test page that shows empty state
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Look for empty state component if it exists
		const emptyState = page.locator('[data-testid="empty-state"]').first();
		if ((await emptyState.count()) > 0) {
			await expect(emptyState).toHaveScreenshot("empty-state.png");
		}
	});

	test("card component visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Capture a card component
		const card = page.locator('[class*="card"]').first();
		if ((await card.count()) > 0) {
			await expect(card).toHaveScreenshot("card-component.png");
		}
	});
});
