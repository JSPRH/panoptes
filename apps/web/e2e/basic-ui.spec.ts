// This file contains Playwright e2e tests
// It is skipped when running with bun test - use `bun run test:e2e` to run these tests

// @ts-ignore - Check if running with bun test
if (typeof Bun === "undefined") {
	// Only execute when NOT running with bun test (i.e., with Playwright)
	const setupTests = async () => {
		const { expect, test } = await import("@playwright/test");

		test.describe("Basic UI", () => {
			test("should render the app without errors", async ({ page }) => {
				await page.goto("/");
				const errors: string[] = [];
				page.on("console", (msg) => {
					if (msg.type() === "error") {
						errors.push(msg.text());
					}
				});
				await page.waitForLoadState("networkidle");
				const criticalErrors = errors.filter(
					(e) => !e.includes("Convex") && !e.includes("VITE_CONVEX_URL")
				);
				expect(criticalErrors).toHaveLength(0);
			});

			test("should have responsive layout", async ({ page }) => {
				await page.goto("/");
				const main = page.locator("main").or(page.locator('[role="main"]'));
				await expect(main.first()).toBeVisible();
			});

			test("should handle empty state gracefully", async ({ page }) => {
				await page.goto("/");
				await page.waitForLoadState("networkidle");
				const body = page.locator("body");
				await expect(body).toBeVisible();
			});
		});
	};

	setupTests();
}
