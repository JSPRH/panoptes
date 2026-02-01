import { expect, test } from "@playwright/test";

test.describe("Visual Tests - Dashboard", () => {
	test("dashboard page visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		// Wait for content to load
		await page.waitForLoadState("networkidle");
		// Wait a bit more for any animations or dynamic content
		await page.waitForTimeout(1000);
		// Take full page screenshot with more lenient threshold
		await expect(page).toHaveScreenshot("dashboard.png", {
			fullPage: true,
			threshold: 0.3,
			maxDiffPixels: 50000,
		});
	});

	test("homepage visual regression", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);
		await expect(page).toHaveScreenshot("homepage.png", {
			fullPage: true,
			threshold: 0.3,
			maxDiffPixels: 100000,
		});
	});

	test("test pyramid page visual regression", async ({ page }) => {
		await page.goto("/test-pyramid");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);
		await expect(page).toHaveScreenshot("test-pyramid.png", {
			fullPage: true,
			threshold: 0.3,
			maxDiffPixels: 10000,
		});
	});

	test("test runs page visual regression", async ({ page }) => {
		await page.goto("/test-runs");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1000);
		await expect(page).toHaveScreenshot("test-runs.png", {
			fullPage: true,
			threshold: 0.3,
			maxDiffPixels: 10000,
		});
	});
});
