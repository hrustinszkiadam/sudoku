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
