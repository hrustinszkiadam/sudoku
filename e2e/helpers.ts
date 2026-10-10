import { expect, type Page } from "@playwright/test";
import { solve } from "../src/shared/sudoku/solver";

export const cell = (page: Page, i: number) =>
	page.locator(`[data-cell="${i}"]`);

/** Creates a room from the home page and returns its code. */
export async function createRoom(
	page: Page,
	opts: { mode?: "Co-op" | "Race"; difficulty?: string } = {},
): Promise<string> {
	await page.goto("/");
	await page.getByText(opts.mode ?? "Co-op", { exact: true }).click();
	await page.getByText(opts.difficulty ?? "easy", { exact: true }).click();
	// Turnstile's test site key passes automatically once its script loads.
	const create = page.getByRole("button", { name: "Create room" });
	await expect(create).toBeEnabled({ timeout: 20_000 });
	await create.click();
	await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
	if ((opts.mode ?? "Co-op") === "Co-op")
		await expect(cell(page, 80)).toBeVisible();
	return page.url().slice(-6);
}

/** Reads the current digits from the cells' accessible labels. */
export async function readBoard(page: Page): Promise<string> {
	const labels = await page
		.locator("[data-cell]")
		.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
	return labels.map((l) => /column \d, (\d)/.exec(l)?.[1] ?? "0").join("");
}

export async function solution(page: Page): Promise<string> {
	const s = solve(await readBoard(page));
	if (!s) throw new Error("Board has no solution");
	return s;
}

/**
 * Clicks a cell and types a digit, waiting until the server confirms it.
 * Paced to stay under the server's 10 messages/s per-connection limit.
 */
export async function placeDigit(page: Page, i: number, digit: string) {
	await page.waitForTimeout(220);
	await cell(page, i).click();
	await page.keyboard.press(digit);
	await expect(cell(page, i)).toHaveAttribute(
		"aria-label",
		new RegExp(`column \\d, ${digit}(?!, pending)`),
	);
}
