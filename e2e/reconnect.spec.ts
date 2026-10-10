import { expect, test } from "@playwright/test";
import { cell, createRoom, placeDigit, readBoard, solution } from "./helpers";

test("a player who loses the network for 10 s resyncs on return", async ({
	browser,
}) => {
	test.setTimeout(90_000);
	const aliceCtx = await browser.newContext();
	const bobCtx = await browser.newContext();
	const alice = await aliceCtx.newPage();
	const bob = await bobCtx.newPage();

	const code = await createRoom(alice);
	await bob.goto(`/r/${code}`);
	await expect(cell(bob, 80)).toBeVisible();

	const answer = await solution(alice);
	const empty = [...(await readBoard(alice))]
		.map((d, i) => (d === "0" ? i : -1))
		.filter((i) => i >= 0);

	await bobCtx.setOffline(true);
	await expect(
		bob.getByRole("status").filter({ hasText: "Reconnecting" }),
	).toBeVisible();

	// Alice keeps playing while Bob is offline.
	for (const i of empty.slice(0, 3)) await placeDigit(alice, i, answer[i]);
	await bob.waitForTimeout(10_000);

	await bobCtx.setOffline(false);
	await expect(
		bob.getByRole("status").filter({ hasText: "Reconnecting" }),
	).toBeHidden({
		timeout: 15_000,
	});
	for (const i of empty.slice(0, 3)) {
		await expect(cell(bob, i)).toHaveAttribute(
			"aria-label",
			new RegExp(`column \\d, ${answer[i]}`),
		);
	}

	// And Bob can play again.
	await placeDigit(bob, empty[3], answer[empty[3]]);
	await expect(cell(alice, empty[3])).toHaveAttribute(
		"aria-label",
		new RegExp(`column \\d, ${answer[empty[3]]}`),
	);
});

test("opening the room in a second tab replaces the first", async ({
	browser,
}) => {
	const ctx = await browser.newContext();
	const first = await ctx.newPage();
	const code = await createRoom(first);
	const second = await ctx.newPage();
	await second.goto(`/r/${code}`);
	await expect(cell(second, 80)).toBeVisible();
	await expect(first.getByText(/open in another tab/)).toBeVisible();
});
