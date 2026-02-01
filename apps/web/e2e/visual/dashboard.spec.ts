import { expect, test } from "@playwright/test";

test.describe("Visual Tests - Dashboard", () => {
	test("dashboard page visual regression", async ({ page }) => {
		await page.goto("/dashboard");
		// Wait for content to load
		await page.waitForLoadState("networkidle");
		// Take full page screenshot
		await expect(page).toHaveScreenshot("dashboard.png", {
			fullPage: true,
		});
	});

	test("homepage visual regression", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("homepage.png", {
			fullPage: true,
		});
	});

	test("test pyramid page visual regression", async ({ page }) => {
		await page.goto("/test-pyramid");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("test-pyramid.png", {
			fullPage: true,
		});
	});

	test("test runs page visual regression", async ({ page }) => {
		await page.goto("/test-runs");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("test-runs.png", {
			fullPage: true,
		});
	});
});
