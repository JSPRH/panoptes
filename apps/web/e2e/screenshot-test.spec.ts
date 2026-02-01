import { expect, test } from "@playwright/test";

test.describe("Screenshot Capture Test", () => {
	const testFn = process.env.CI ? test.skip : test;
	testFn("should capture screenshot on failure", async ({ page }) => {
		await page.goto("/");
		// Intentionally fail to trigger screenshot capture
		// This test verifies that screenshots are captured and uploaded to Convex
		// Skipped in CI - screenshot capture is tested automatically by Playwright on failures
		await expect(page.locator("non-existent-element-that-will-fail")).toBeVisible({
			timeout: 1000,
		});
	});
});
