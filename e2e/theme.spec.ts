import { expect, test } from "@playwright/test";

const theme = (page: import("@playwright/test").Page) =>
	page.locator("html").getAttribute("data-theme");

test("theme follows the system until you pick one, and the pick sticks", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("/");
	expect(await theme(page)).toBe("light");
	await page.emulateMedia({ colorScheme: "dark" });
	await expect.poll(() => theme(page)).toBe("dark");

	await page.getByRole("button", { name: /profile and settings/ }).click();
	const light = page.getByRole("button", { name: "Light" });
	await light.click();
	await expect(light).toHaveAttribute("aria-pressed", "true");
	expect(await theme(page)).toBe("light");

	// Saved: a reload under a dark system stays light, before React even runs.
	await page.reload();
	expect(await theme(page)).toBe("light");
	await expect(
		page.locator('meta[name="theme-color"]').first(),
	).toHaveAttribute("content", "#FCFDFF");

	await page.getByRole("button", { name: /profile and settings/ }).click();
	await page.getByRole("button", { name: "System" }).click();
	expect(await theme(page)).toBe("dark");
});
