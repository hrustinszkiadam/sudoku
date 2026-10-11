import { expect, test } from "@playwright/test";
import { cell, createRoom, placeDigit, readBoard, solution } from "./helpers";

test("two players create, join and finish a co-op game", async ({
	browser,
}) => {
	test.setTimeout(120_000);
	const alice = await (await browser.newContext()).newPage();
	const bob = await (await browser.newContext()).newPage();

	const code = await createRoom(alice);
	await bob.goto(`/r/${code}`);
	await expect(
		bob.getByRole("list", { name: "Players" }).getByRole("listitem"),
	).toHaveCount(2);
	await expect(
		alice.getByRole("list", { name: "Players" }).getByRole("listitem"),
	).toHaveCount(2);

	const answer = await solution(alice);
	const empty = [...(await readBoard(alice))]
		.map((d, i) => (d === "0" ? i : -1))
		.filter((i) => i >= 0);

	// Alice places a digit; Bob sees it.
	const first = empty[0];
	await placeDigit(alice, first, answer[first]);
	await expect(cell(bob, first)).toHaveAttribute(
		"aria-label",
		new RegExp(`column \\d, ${answer[first]}`),
	);

	// Presence: Bob sees Alice's selection.
	await cell(alice, empty[1]).click();
	await expect(cell(bob, empty[1])).toHaveAttribute(
		"aria-label",
		/selected by/,
	);

	// A wrong digit counts as a mistake for everyone.
	const wrong = answer[empty[1]] === "1" ? "2" : "1";
	await alice.keyboard.press(wrong);
	await expect(bob.getByText(/Mistakes:\s*1/)).toBeVisible();

	// Take turns to finish the board.
	for (const [n, i] of empty.slice(1).entries()) {
		await placeDigit(n % 2 ? bob : alice, i, answer[i]);
	}
	await expect(alice.getByText("Solved together!")).toBeVisible();
	await expect(bob.getByText("Solved together!")).toBeVisible();
});

test("solo play works as a one-person co-op room", async ({ page }) => {
	test.setTimeout(120_000);
	await createRoom(page);
	const answer = await solution(page);
	const board = await readBoard(page);
	for (let i = 0; i < 81; i++) {
		if (board[i] === "0") await placeDigit(page, i, answer[i]);
	}
	await expect(page.getByText("Solved together!")).toBeVisible();
});

test("hints reveal a cell and note edits can be undone", async ({ page }) => {
	await createRoom(page);
	const answer = await solution(page);
	const empty = [...(await readBoard(page))]
		.map((d, i) => (d === "0" ? i : -1))
		.filter((i) => i >= 0);

	await cell(page, empty[0]).click();
	await page.keyboard.press("h");
	await expect(cell(page, empty[0])).toHaveAttribute(
		"aria-label",
		new RegExp(`column \\d, ${answer[empty[0]]}`),
	);
	await expect(page.getByText(/Hints:\s*1/)).toBeVisible();

	await cell(page, empty[1]).click();
	await page.keyboard.press("Shift+Digit3");
	await expect(cell(page, empty[1])).toHaveAttribute("aria-label", /notes 3/);
	await page.keyboard.press("ControlOrMeta+z");
	await expect(cell(page, empty[1])).toHaveAttribute("aria-label", /empty$/);
});

test("copy code copies just the code; the clock waits for the first move", async ({
	browser,
}) => {
	const context = await browser.newContext({
		permissions: ["clipboard-read", "clipboard-write"],
	});
	const page = await context.newPage();
	const code = await createRoom(page);

	await page.getByRole("button", { name: "Copy code" }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
	await page.getByRole("button", { name: "Copy invite link" }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
		new RegExp(`/r/${code}$`),
	);

	// Waiting for friends: the clock stays at 0:00.
	await expect(page.getByText("starts with the first move")).toBeVisible();
	await page.waitForTimeout(2200);
	await expect(page.getByText(/Elapsed time\s*0:00/)).toBeVisible();

	const empty = (await readBoard(page)).indexOf("0");
	await cell(page, empty).click();
	await page.keyboard.press("Shift+Digit1");
	await expect(page.getByText("starts with the first move")).toBeHidden();
	await expect(page.getByText(/Elapsed time\s*0:0[1-9]/)).toBeVisible({
		timeout: 5000,
	});
});
