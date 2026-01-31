import { expect, test } from "@playwright/test";

test.describe("Screenshot Capture Test", () => {
	test("should capture screenshot on failure", async ({ page }) => {
		await page.goto("/");
		// Intentionally fail to trigger screenshot capture
		// This test verifies that screenshots are captured and uploaded to Convex
		await expect(page.locator("non-existent-element-that-will-fail")).toBeVisible({
			timeout: 1000,
		});
	});
});
