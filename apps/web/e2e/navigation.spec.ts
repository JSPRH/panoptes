import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
	test("should navigate to test pyramid page", async ({ page }) => {
		await page.goto("/");
		await page.goto("/pyramid");
		await expect(page).toHaveURL(/.*pyramid/);
	});

	test("should navigate to test explorer page", async ({ page }) => {
		await page.goto("/");
		await page.goto("/explorer");
		await expect(page).toHaveURL(/.*explorer/);
	});

	test("should navigate to test runs page", async ({ page }) => {
		await page.goto("/");
		await page.goto("/runs");
		await expect(page).toHaveURL(/.*runs/);
	});

	test("should navigate to anomalies page", async ({ page }) => {
		await page.goto("/");
		await page.goto("/anomalies");
		await expect(page).toHaveURL(/.*anomalies/);
	});
});
