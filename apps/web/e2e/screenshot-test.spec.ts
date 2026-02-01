// This file contains Playwright e2e tests
// It is skipped when running with bun test - use `bun run test:e2e` to run these tests

// @ts-ignore - Check if running with bun test
if (typeof Bun === "undefined") {
	// Only execute when NOT running with bun test (i.e., with Playwright)
	const setupTests = async () => {
		const { expect, test } = await import("@playwright/test");

		test.describe("Screenshot Capture Test", () => {
			const testFn = process.env.CI ? test.skip : test;
			testFn("should capture screenshot on failure", async ({ page }) => {
				await page.goto("/");
				await expect(page.locator("non-existent-element-that-will-fail")).toBeVisible({
					timeout: 1000,
				});
			});
		});
	};

	setupTests();
}
