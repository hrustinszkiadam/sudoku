import { expect, test } from "@playwright/test";
import { createRoom } from "./helpers";

const SITE = "https://sudoku.hrustinszki.com";
const canonical = (page: import("@playwright/test").Page) =>
	page.locator("link[rel=canonical]").getAttribute("href");
const robots = (page: import("@playwright/test").Page) =>
	page.locator("meta[name=robots]").getAttribute("content");

test("home has complete share metadata", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle(
		"Multiplayer Sudoku: play together in real time",
	);
	expect(await canonical(page)).toBe(`${SITE}/`);
	expect(await robots(page)).toBe("index, follow");
	for (const [selector, value] of [
		['meta[property="og:title"]', /Multiplayer Sudoku/],
		['meta[property="og:image"]', `${SITE}/og-image.png`],
		['meta[name="twitter:card"]', "summary_large_image"],
		['meta[name="description"]', /multiplayer sudoku/i],
	] as const) {
		await expect(page.locator(selector)).toHaveAttribute("content", value);
	}
	const ld = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').textContent()) ??
			"{}",
	);
	expect(ld).toMatchObject({
		"@type": "WebApplication",
		name: "Multiplayer Sudoku",
	});
});

test("pages set their own title, canonical URL and robots", async ({
	page,
}) => {
	await page.goto("/daily");
	await expect(page).toHaveTitle("Daily puzzle · Sudoku");
	expect(await canonical(page)).toBe(`${SITE}/daily`);

	await page.goto("/leaderboard");
	await expect(page).toHaveTitle("Leaderboard · Sudoku");
	expect(await canonical(page)).toBe(`${SITE}/leaderboard`);

	await page.goto("/no/such/page");
	await expect(page).toHaveTitle("Page not found · Sudoku");
	expect(await robots(page)).toBe("noindex, nofollow");
	await expect(
		page.getByRole("heading", { name: "Page not found" }),
	).toBeVisible();
});

test("room pages are titled and kept out of search", async ({ page }) => {
	const code = await createRoom(page);
	await expect(page).toHaveTitle(`Room ${code} · Co-op, easy · Sudoku`);
	expect(await robots(page)).toBe("noindex, nofollow");
});

test("static metadata files are served with the right types", async ({
	request,
}) => {
	for (const [path, type] of [
		["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
		["/icon.svg", /image\/svg\+xml/],
		["/og-image.png", /image\/png/],
		["/manifest.webmanifest", /application\/manifest\+json/],
		["/robots.txt", /text\/plain/],
		["/sitemap.xml", /xml/],
	] as const) {
		const res = await request.get(path);
		expect(res.status(), path).toBe(200);
		expect(res.headers()["content-type"], path).toMatch(type);
	}
	const manifest = await (await request.get("/manifest.webmanifest")).json();
	expect(manifest).toMatchObject({
		id: "/",
		lang: "en",
		display: "standalone",
	});
});
