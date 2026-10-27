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
		.getByRole("link", { name: "Privacy policy" })
		.click();
	await expect(page).toHaveURL(/\/privacy$/);
});

test("the privacy policy is indexable and the old Hungarian URL redirects", async ({
	page,
}) => {
	await page.goto("/adatkezeles");
	await expect(page).toHaveURL(/\/privacy$/);
	await expect(page).toHaveTitle("Privacy policy · Sudoku");
	await expect(
		page.getByRole("heading", { level: 1, name: "Privacy policy" }),
	).toBeVisible();
	expect(await page.locator("link[rel=canonical]").getAttribute("href")).toBe(
		"https://sudoku.hrustinszki.com/privacy",
	);
	// The notice never covers the page it points to.
	await expect(
		page.getByRole("region", { name: "Cookie notice" }),
	).toBeHidden();
});
