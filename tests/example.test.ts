import { describe, expect, it } from "vitest";

describe("Example test suite", () => {
	it("should pass", () => {
		expect(1 + 1).toBe(2);
	});

	it("should also pass", () => {
		expect(true).toBe(true);
	});

	// This test is intentionally skipped to avoid failing pre-commit hooks
	// Uncomment and run manually to test failure reporting
	// it("should fail", () => {
	// 	expect(1 + 1).toBe(3);
	// });

	it.skip("should be skipped", () => {
		expect(true).toBe(false);
	});

	it.todo("should be a todo");
});
