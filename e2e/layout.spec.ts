import { expect, test } from "@playwright/test";

test.use({
	viewport: { width: 360, height: 740 },
	hasTouch: true,
	isMobile: true,
});

for (const path of ["/", "/dev/board", "/daily", "/leaderboard"]) {
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
