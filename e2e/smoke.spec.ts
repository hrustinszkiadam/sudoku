import { expect, test } from "@playwright/test";

test("serves the SPA and the API from one origin", async ({
	page,
	request,
}) => {
	const health = await request.get("/api/health");
	expect(await health.json()).toEqual({ ok: true });

	await page.goto("/r/anything");
	await expect(page.locator("#root")).not.toBeEmpty();
});

test("daily puzzle opens a personal room", async ({ page }) => {
	await page.goto("/daily");
	await expect(
		page.getByRole("heading", { name: "Daily puzzle" }),
	).toBeVisible();
	await page.getByRole("link", { name: "Play today's puzzle" }).click();
	await expect(page).toHaveURL(/\/r\/[A-Z0-9]{6}$/);
	await expect(page.locator('[data-cell="80"]')).toBeVisible();
	await expect(page.getByText(/Co-op · medium/i)).toBeVisible();
});

test("leaderboard filters by mode and difficulty", async ({ page }) => {
	await page.goto("/leaderboard");
	await expect(
		page.getByRole("heading", { name: "Leaderboard" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Race" }).click();
	await page.getByRole("button", { name: "expert" }).click();
	await expect(page.getByRole("button", { name: "expert" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(
		page
			.getByText("No results yet")
			.or(page.getByRole("columnheader", { name: "Best" })),
	).toBeVisible();
	// The filters live in the URL, so the view survives a reload.
	await expect(page).toHaveURL(/mode=race/);
	await page.reload();
	await expect(page.getByRole("button", { name: "Race" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});
