import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { RACE_MAX_DURATION_MS } from "../src/shared/constants";
import type { GameRoom } from "../src/worker/room/GameRoom";
import {
	api,
	closeAllSockets,
	connect,
	createRoomFor,
	type Guest,
	mockTurnstile,
	NEARLY,
	newGuest,
	seedPuzzles,
	type TestSocket,
} from "./helpers";

beforeAll(seedPuzzles);
beforeEach(() => {
	mockTurnstile();
});
afterEach(async () => {
	vi.restoreAllMocks();
	await closeAllSockets();
});

const right = (cell: number) => Number(NEARLY.solution[cell]);
const wrong = (cell: number) => (right(cell) === 1 ? 2 : 1);

/** Race room on the 3-hole puzzle with two connected players. */
async function lobby(): Promise<{
	code: string;
	host: Guest;
	guest: Guest;
	a: TestSocket;
	b: TestSocket;
}> {
	const host = await newGuest();
	const guest = await newGuest();
	const code = await createRoomFor(host, {
		mode: "race",
		difficulty: "expert",
	});
	const a = await connect(code, host);
	const snap = await a.next("snapshot");
	expect(snap).toMatchObject({ mode: "race", status: "lobby", startsAt: null });
	const b = await connect(code, guest);
	const bSnap = await b.next("snapshot");
	// Pencils go out in join order.
	expect(bSnap.players.map((p) => p.pencil)).toEqual([1, 2]);
	await a.next("player_joined");
	return { code, host, guest, a, b };
}

/** Starts the race and skips the 3 s countdown. */
async function startNow(code: string, a: TestSocket, b: TestSocket) {
	a.send({ type: "start" });
	await a.next("status");
	await b.next("status");
	await runInDurableObject(env.GAME_ROOM.getByName(code), (room: GameRoom) => {
		room.setMeta({ startsAt: Date.now() - 1, startedAt: Date.now() - 1 });
	});
}

describe("race lobby", () => {
	it("only the host can start, and only with 2 connected players", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host, {
			mode: "race",
			difficulty: "expert",
		});
		const a = await connect(code, host);
		await a.next("snapshot");
		a.send({ type: "start" });
		expect(await a.next("error")).toMatchObject({ code: "not_enough_players" });

		const guest = await newGuest();
		const b = await connect(code, guest);
		await b.next("snapshot");
		b.send({ type: "start" });
		expect(await b.next("error")).toMatchObject({ code: "not_host" });

		const before = Date.now();
		a.send({ type: "start" });
		const status = await b.next("status");
		expect(status.status).toBe("playing");
		expect(status.startsAt).toBeGreaterThanOrEqual(before + 3000);
		expect(status.startsAt).toBeLessThanOrEqual(Date.now() + 3000);

		a.send({ type: "start" });
		expect(await a.next("error")).toMatchObject({ code: "not_playing" });
	});

	it("rejects moves before startsAt", async () => {
		const { a, b } = await lobby();
		a.send({ type: "place", cell: 0, digit: right(0) });
		expect(await a.next("error")).toMatchObject({ code: "not_playing" });
		a.send({ type: "start" });
		await a.next("status");
		await b.next("status");
		a.send({ type: "place", cell: 0, digit: right(0) });
		expect(await a.next("error")).toMatchObject({ code: "not_playing" });
	});

	it("does not let new players join once the race has started", async () => {
		const { code, a, b } = await lobby();
		a.send({ type: "start" });
		await b.next("status");
		const late = await newGuest();
		const res = await api(`/api/rooms/${code}/ws`, late, {
			headers: { Upgrade: "websocket" },
		});
		expect(res.status).toBe(409);
	});
});

describe("race play", () => {
	it("other players receive only progress, never digits", async () => {
		const { code, host, a, b } = await lobby();
		await startNow(code, a, b);

		a.send({ type: "place", cell: 0, digit: wrong(0) });
		expect(await a.next("mistake")).toMatchObject({ cell: 0, by: host.userId });
		expect(await b.next("progress")).toEqual({
			type: "progress",
			userId: host.userId,
			filled: 0,
			mistakes: 1,
			hints: 0,
		});

		a.send({ type: "place", cell: 0, digit: right(0) });
		expect(await a.next("applied")).toMatchObject({ version: 1, cell: 0 });
		expect(await b.next("progress")).toMatchObject({ filled: 1, mistakes: 1 });

		// B's own board is untouched; A's snapshot shows A's progress.
		b.send({ type: "resync" });
		const bSnap = await b.next("snapshot");
		expect(bSnap.board).toBe(NEARLY.givens);
		expect(bSnap.notes.every((m) => m === 0)).toBe(true);
		expect(bSnap.players.find((p) => p.userId === host.userId)).toMatchObject({
			filled: 1,
			mistakes: 1,
			selected: null,
		});
		a.send({ type: "resync" });
		const aSnap = await a.next("snapshot");
		expect(aSnap.board[0]).toBe(String(right(0)));
		expect(aSnap.version).toBe(1);
		expect(aSnap.mistakes).toBe(1);

		expect(
			b.received.some((m) => m.type === "applied" || m.type === "mistake"),
		).toBe(false);
	});

	it("keeps notes and presence off the server", async () => {
		const { code, a, b } = await lobby();
		await startNow(code, a, b);
		a.send({ type: "note", cell: 0, digit: 1 });
		expect(await a.next("error")).toMatchObject({ code: "invalid_message" });
		a.send({ type: "select", cell: 0 });
		expect(await b.none("presence")).toBe(true);
	});

	it("scores finishers, ranks them and records the race in D1", async () => {
		const { code, host, guest, b, ...rest } = await lobby();
		let { a } = rest;
		await startNow(code, a, b);

		b.send({ type: "place", cell: 1, digit: wrong(1) });
		await b.next("mistake");
		for (const cell of [0, 1, 2])
			a.send({ type: "place", cell, digit: right(cell) });
		const aFinished = await b.next("player_finished");
		expect(aFinished.userId).toBe(host.userId);
		expect(aFinished.scoreMs).toBeGreaterThanOrEqual(0);
		expect(aFinished.scoreMs).toBeLessThan(10_000);
		expect(aFinished.finishMs).toBe(aFinished.scoreMs);

		// Reconnecting clients see the finish time on the player too.
		const c = await connect(code, host);
		const again = await c.next("snapshot");
		expect(again.players.find((p) => p.userId === host.userId)?.finishMs).toBe(
			aFinished.finishMs,
		);
		a = c;

		// A finished; B is still playing, so no game over yet.
		expect(await a.none("game_over")).toBe(true);
		for (const cell of [0, 1, 2])
			b.send({ type: "place", cell, digit: right(cell) });
		const over = await a.next("game_over");
		expect(over.results.map((r) => [r.userId, r.rank, r.mistakes])).toEqual([
			[host.userId, 1, 0],
			[guest.userId, 2, 1],
		]);
		expect(over.results[1].scoreMs).toBeGreaterThanOrEqual(10_000);

		const rows = await env.DB.prepare(
			`SELECT gp.user_id, gp.rank, gp.score_ms, g.status, g.mode
			 FROM game_players gp JOIN games g ON g.id = gp.game_id
			 WHERE g.room_code = ? ORDER BY gp.rank`,
		)
			.bind(code)
			.all<{ user_id: string; rank: number; status: string; mode: string }>();
		expect(
			rows.results.map((r) => [r.user_id, r.rank, r.status, r.mode]),
		).toEqual([
			[host.userId, 1, "won", "race"],
			[guest.userId, 2, "won", "race"],
		]);
	});

	it("ends when the remaining connected players have all finished", async () => {
		const { code, a, b } = await lobby();
		await startNow(code, a, b);
		for (const cell of [0, 1, 2])
			a.send({ type: "place", cell, digit: right(cell) });
		await a.next("player_finished");
		await b.close();
		expect((await a.next("game_over")).results[1].rank).toBeNull();
	});

	it("lets the host end the race early; non-finishers are unranked", async () => {
		const { code, guest, a, b } = await lobby();
		await startNow(code, a, b);
		b.send({ type: "end" });
		expect(await b.next("error")).toMatchObject({ code: "not_host" });
		b.send({ type: "place", cell: 0, digit: right(0) });
		await b.next("applied");
		a.send({ type: "end" });
		const over = await b.next("game_over");
		expect(over.results[0]).toMatchObject({
			userId: guest.userId,
			rank: null,
			placements: 1,
		});
		expect(over.results.every((r) => r.rank === null)).toBe(true);
	});

	it("keeps one shared clock: an empty race never pauses", async () => {
		const { code, a, b } = await lobby();
		await startNow(code, a, b);
		await a.close();
		await b.close();
		const meta = await runInDurableObject(
			env.GAME_ROOM.getByName(code),
			(room: GameRoom) => room.meta,
		);
		expect(meta.pausedAt).toBeNull();
	});

	it("the alarm ends a race after 2 hours", async () => {
		const { code, a, b } = await lobby();
		a.send({ type: "start" });
		await b.next("status");
		const stub = env.GAME_ROOM.getByName(code);
		await runInDurableObject(stub, async (room: GameRoom, state) => {
			expect(await state.storage.getAlarm()).toBe(
				(room.meta.startsAt ?? 0) + RACE_MAX_DURATION_MS,
			);
			room.setMeta({ startsAt: Date.now() - RACE_MAX_DURATION_MS - 1 });
		});
		await runDurableObjectAlarm(stub);
		await a.next("game_over");
		expect((await stub.preview()).exists).toBe(true);
	});

	it("hints reveal a cell for the player only, with a 30 s penalty", async () => {
		const { code, host, a, b } = await lobby();
		await startNow(code, a, b);
		a.send({ type: "hint", cell: 0 });
		expect(await a.next("applied")).toMatchObject({
			cell: 0,
			digit: right(0),
			hint: true,
			version: 1,
		});
		expect(await b.next("progress")).toEqual({
			type: "progress",
			userId: host.userId,
			filled: 1,
			mistakes: 0,
			hints: 1,
		});
		a.send({ type: "hint", cell: 0 });
		expect(await a.next("error")).toMatchObject({ code: "invalid_move" });

		a.send({ type: "place", cell: 1, digit: right(1) });
		expect((await a.next("applied")).version).toBe(2);
		a.send({ type: "hint", cell: 2 });
		const finished = await b.next("player_finished");
		expect(finished.scoreMs).toBeGreaterThanOrEqual(60_000);
		expect(finished.scoreMs).toBeLessThan(70_000);
	});
});
