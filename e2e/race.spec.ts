import { expect, type Page, test } from "@playwright/test";
import { cell, createRoom, placeDigit, readBoard, solution } from "./helpers";

/** Records every WebSocket frame the page receives. */
function captureFrames(page: Page): string[] {
	const frames: string[] = [];
	page.on("websocket", (ws) => {
		ws.on("framereceived", (f) => {
			if (typeof f.payload === "string") frames.push(f.payload);
		});
	});
	return frames;
}

async function solveOwnBoard(page: Page) {
	const answer = await solution(page);
	const board = await readBoard(page);
	for (let i = 0; i < 81; i++) {
		if (board[i] === "0") await placeDigit(page, i, answer[i]);
	}
}

test("a full race between two players ends with ranks", async ({ browser }) => {
	test.setTimeout(180_000);
	const alice = await (await browser.newContext()).newPage();
	const bob = await (await browser.newContext()).newPage();
	const bobFrames = captureFrames(bob);

	const code = await createRoom(alice, { mode: "Race" });
	await expect(
		alice.getByRole("heading", { name: "Race lobby" }),
	).toBeVisible();
	const start = alice.getByRole("button", { name: "Start race" });
	await expect(start).toBeDisabled();

	await bob.goto(`/r/${code}`);
	await expect(bob.getByText("Waiting for the host to start")).toBeVisible();
	await expect(start).toBeEnabled();
	await start.click();

	// 3-2-1 countdown, then both boards are playable.
	await expect(alice.getByRole("timer")).toBeVisible();
	await expect(alice.getByRole("timer")).toBeHidden({ timeout: 6_000 });
	await expect(cell(bob, 80)).toBeVisible();
	await expect(bob.getByRole("timer")).toBeHidden({ timeout: 6_000 });

	// Bob makes a mistake, then both race to the finish.
	const bobAnswer = await solution(bob);
	const bobEmpty = (await readBoard(bob)).indexOf("0");
	await cell(bob, bobEmpty).click();
	await bob.keyboard.press(bobAnswer[bobEmpty] === "1" ? "2" : "1");
	await expect(bob.getByText(/Your mistakes\s*1/)).toBeVisible();

	await Promise.all([solveOwnBoard(alice), solveOwnBoard(bob)]);

	for (const page of [alice, bob]) {
		await expect(page.getByText("Race over")).toBeVisible();
		const rows = page.getByRole("row");
		await expect(rows).toHaveCount(3);
		await expect(rows.nth(1).getByRole("cell").first()).toHaveText("1");
		await expect(rows.nth(2).getByRole("cell").first()).toHaveText("2");
	}

	// Bob's socket never received Alice's moves, only counts.
	const bobId = JSON.parse(
		bobFrames.find((f) => f.includes('"snapshot"')) ?? "{}",
	).me;
	for (const f of bobFrames) {
		if (f === "pong") continue;
		const msg = JSON.parse(f);
		if (msg.type === "applied" || msg.type === "mistake")
			expect(msg.by).toBe(bobId);
	}
	expect(bobFrames.some((f) => f.includes('"progress"'))).toBe(true);
});
