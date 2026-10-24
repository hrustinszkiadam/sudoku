import { expect, test } from "@playwright/test";
import { createRoom } from "./helpers";

test.use({
	viewport: { width: 360, height: 740 },
	hasTouch: true,
	isMobile: true,
});

for (const path of [
	"/",
	"/dev/board",
	"/daily",
	"/leaderboard",
	"/adatkezeles",
]) {
	test(`${path} fits a 360 px screen without horizontal scroll`, async ({
		page,
	}) => {
		await page.goto(path);
		// Wait for the session: the nickname in the header is the widest part.
		await expect(page.getByRole("banner")).toContainText(/-\d{4}/);
		const width = await page.evaluate(
			() => document.documentElement.scrollWidth,
		);
		expect(width).toBeLessThanOrEqual(360);
	});
}

test("a room fits a 360 px screen and offers the invite sheet once", async ({
	page,
}) => {
	await createRoom(page);
	await expect(
		page.getByRole("dialog", { name: "Invite friends" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Start solving on my own" }).tap();
	await expect(page.getByRole("dialog")).toBeHidden();
	const width = await page.evaluate(() => document.documentElement.scrollWidth);
	expect(width).toBeLessThanOrEqual(360);
	await page.reload();
	await expect(page.locator('[data-cell="80"]')).toBeVisible();
	await expect(page.getByRole("dialog")).toBeHidden();
});
