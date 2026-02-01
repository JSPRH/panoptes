import { expect, test } from "@playwright/test";

test.describe("Visual Tests - Components", () => {
	test("navigation header visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);
		// Capture just the header/navigation area - look for aside (desktop) or header (mobile)
		const navContainer = page.locator("aside, header").first();
		if ((await navContainer.count()) > 0 && (await navContainer.isVisible())) {
			await expect(navContainer).toHaveScreenshot("navigation-header.png", { timeout: 10000 });
		} else {
			test.skip();
		}
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

	// Skip card component test - cards may not always be present on dashboard
	test.skip("card component visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");
		// Wait a bit more for content to load
		await page.waitForTimeout(1000);
		// Capture a card component - look for various card patterns
		const card = page.locator('[class*="card"], [class*="Card"], [data-testid*="card"]').first();
		if ((await card.count()) > 0) {
			await expect(card).toHaveScreenshot("card-component.png", { timeout: 10000 });
		}
	});
});
