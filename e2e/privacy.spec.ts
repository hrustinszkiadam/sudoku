import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("the cookie notice shows once and links to the privacy policy", async ({
	page,
}) => {
	await page.goto("/");
	const notice = page.getByRole("region", { name: "Cookie notice" });
	await expect(notice).toBeVisible();
	await notice.getByRole("button", { name: "OK" }).click();
	await expect(notice).toBeHidden();
	await page.reload();
	await expect(page.getByRole("banner")).toContainText(/-\d{4}/);
	await expect(notice).toBeHidden();

	await page
		.getByRole("contentinfo")
		.getByRole("link", { name: "Adatkezelési tájékoztató" })
		.click();
	await expect(page).toHaveURL(/\/adatkezeles$/);
});

test("the privacy policy is a Hungarian, indexable page", async ({ page }) => {
	await page.goto("/adatkezeles");
	await expect(page).toHaveTitle("Adatkezelési tájékoztató · Sudoku");
	await expect(page.locator("main")).toHaveAttribute("lang", "hu");
	await expect(
		page.getByRole("heading", { level: 1, name: "Adatkezelési tájékoztató" }),
	).toBeVisible();
	expect(await page.locator("link[rel=canonical]").getAttribute("href")).toBe(
		"https://sudoku.hrustinszki.com/adatkezeles",
	);
	// The notice never covers the page it points to.
	await expect(
		page.getByRole("region", { name: "Cookie notice" }),
	).toBeHidden();
});
