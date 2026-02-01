import { expect, test } from "@playwright/test";

test.describe("Screenshot Capture Test", () => {
	// Skip this test - it's intentionally failing to test screenshot capture
	// which is already tested by other failing tests
	test.skip("should capture screenshot on failure", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("non-existent-element-that-will-fail")).toBeVisible({
			timeout: 1000,
		});
	});
});
