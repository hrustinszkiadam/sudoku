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
import { EASY } from "../src/shared/sudoku/fixtures";
import { createRoom } from "../src/worker/routes/rooms";
import {
	api,
	closeAllSockets,
	connect,
	createRoomFor,
	mockTurnstile,
	NEARLY,
	newGuest,
	seedPuzzles,
} from "./helpers";

beforeAll(seedPuzzles);
beforeEach(() => {
	mockTurnstile();
});
afterEach(async () => {
	vi.restoreAllMocks();
	await closeAllSockets();
});

/** First empty cell of the EASY puzzle (row 1, col 3) and its answer. */
const CELL = 2;
const RIGHT = Number(EASY.solution[CELL]);
const WRONG = RIGHT === 1 ? 2 : 1;

describe("POST /api/rooms", () => {
	it("creates a co-op room and previews it", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

		const preview = await api(`/api/rooms/${code}`, host);
		expect(await preview.json()).toEqual({
			exists: true,
			mode: "coop",
			difficulty: "easy",
			status: "playing",
			playerCount: 0,
			maxPlayers: 8,
		});
		const missing = await api("/api/rooms/ZZZZZZ", host);
		expect(await missing.json()).toEqual({ exists: false });
	});

	it("validates input and requires a session", async () => {
		const host = await newGuest();
		const bad = await api("/api/rooms", host, {
			method: "POST",
			body: JSON.stringify({
				mode: "solo",
				difficulty: "easy",
				turnstileToken: "x",
			}),
		});
		expect(bad.status).toBe(400);
		const anon = await api("/api/rooms", null, {
			method: "POST",
			body: JSON.stringify({
				mode: "coop",
				difficulty: "easy",
				turnstileToken: "x",
			}),
		});
		expect(anon.status).toBe(401);
	});

	it("verifies Turnstile server-side", async () => {
		vi.restoreAllMocks();
		mockTurnstile(false);
		const host = await newGuest();
		const res = await api("/api/rooms", host, {
			method: "POST",
			body: JSON.stringify({
				mode: "coop",
				difficulty: "easy",
				turnstileToken: "bad",
			}),
		});
		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({
			error: { code: "turnstile_failed" },
		});
	});
});

describe("init and room codes", () => {
	const params = {
		mode: "coop" as const,
		difficulty: "easy" as const,
		puzzleId: "t-easy",
		givens: EASY.givens,
		solution: EASY.solution,
		hostId: crypto.randomUUID(),
	};

	it("init is idempotent", async () => {
		const stub = env.GAME_ROOM.getByName("INIT22");
		expect(await stub.init({ ...params, code: "INIT22" })).toEqual({
			created: true,
		});
		expect(await stub.init({ ...params, code: "INIT22" })).toEqual({
			created: false,
		});
	});

	it("retries on a code collision", async () => {
		const codes = ["DUPE22", "DUPE22", "FRESH2"];
		expect(await createRoom(env, params, () => codes.shift() ?? "")).toBe(
			"DUPE22",
		);
		const next = ["DUPE22", "FRESH2"];
		expect(await createRoom(env, params, () => next.shift() ?? "")).toBe(
			"FRESH2",
		);
	});

	it("gives up after 5 collisions", async () => {
		await createRoom(env, params, () => "TAKEN2");
		expect(await createRoom(env, params, () => "TAKEN2")).toBeNull();
	});
});

describe("WebSocket route", () => {
	it("requires an upgrade, then a session", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		expect((await api(`/api/rooms/${code}/ws`, host)).status).toBe(426);
		const anon = await api(`/api/rooms/${code}/ws`, null, {
			headers: { Upgrade: "websocket" },
		});
		expect(anon.status).toBe(401);
		const missing = await api("/api/rooms/NOPE22/ws", host, {
			headers: { Upgrade: "websocket" },
		});
		expect(missing.status).toBe(404);
	});

	it("ignores client-supplied X-User-* headers", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host, {
			"X-User-Id": crypto.randomUUID(),
			"X-User-Name": "Spoofed",
		});
		const snap = await ws.next("snapshot");
		expect(snap.me).toBe(host.userId);
		expect(snap.players.map((p) => p.name)).toEqual([host.name]);
	});
});

describe("co-op play", () => {
	it("joins with a snapshot that never contains the solution", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		const snap = await ws.next("snapshot");
		expect(snap).toMatchObject({
			me: host.userId,
			hostId: host.userId,
			mode: "coop",
			status: "playing",
			givens: EASY.givens,
			board: EASY.givens,
			version: 0,
			mistakes: 0,
			results: null,
		});
		expect(snap.players).toHaveLength(1);
		expect(snap.players[0]).toMatchObject({
			connected: true,
			pencil: 1,
		});
		expect(JSON.stringify(snap)).not.toContain(EASY.solution);
	});

	it("applies a correct digit and rejects a wrong one", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		const bSnap = await b.next("snapshot");
		expect(bSnap.players).toHaveLength(2);
		expect((await a.next("player_joined")).player.userId).toBe(friend.userId);

		a.send({ type: "place", cell: CELL, digit: WRONG });
		expect(await b.next("mistake")).toEqual({
			type: "mistake",
			cell: CELL,
			digit: WRONG,
			by: host.userId,
		});

		b.send({ type: "resync" });
		const afterMistake = await b.next("snapshot");
		expect(afterMistake.board).toBe(EASY.givens);
		expect(afterMistake.mistakes).toBe(1);
		expect(afterMistake.version).toBe(0);

		a.send({ type: "place", cell: CELL, digit: RIGHT });
		const applied = await b.next("applied");
		expect(applied).toEqual({
			type: "applied",
			version: 1,
			cell: CELL,
			digit: RIGHT,
			by: host.userId,
		});

		// The cell is now locked.
		b.send({ type: "place", cell: CELL, digit: RIGHT });
		expect(await b.next("error")).toMatchObject({ code: "invalid_move" });
		// Givens can't be overwritten either.
		b.send({ type: "place", cell: 0, digit: 5 });
		expect(await b.next("error")).toMatchObject({ code: "invalid_move" });
	});

	it("toggles and clears notes, removing them from peers on placement", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");

		ws.send({ type: "note", cell: 3, digit: RIGHT }); // row-mate of CELL
		expect(await ws.next("notes")).toMatchObject({
			version: 1,
			cell: 3,
			mask: 1 << (RIGHT - 1),
		});
		ws.send({ type: "note", cell: 3, digit: 9 });
		expect((await ws.next("notes")).version).toBe(2);
		ws.send({ type: "clear_notes", cell: 3 });
		expect(await ws.next("notes")).toMatchObject({ version: 3, mask: 0 });

		ws.send({ type: "note", cell: 3, digit: RIGHT });
		await ws.next("notes");
		ws.send({ type: "place", cell: CELL, digit: RIGHT });
		expect((await ws.next("applied")).version).toBe(5);
		ws.send({ type: "resync" });
		const snap = await ws.next("snapshot");
		expect(snap.notes[3]).toBe(0);

		ws.send({ type: "note", cell: 0, digit: 1 });
		expect(await ws.next("error")).toMatchObject({ code: "invalid_move" });
	});

	it("broadcasts presence without bumping the version", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");

		a.send({ type: "select", cell: 40 });
		expect(await b.next("presence")).toEqual({
			type: "presence",
			userId: host.userId,
			cell: 40,
		});
		b.send({ type: "resync" });
		const snap = await b.next("snapshot");
		expect(snap.version).toBe(0);
		expect(snap.players.find((p) => p.userId === host.userId)?.selected).toBe(
			40,
		);
	});

	it("finishes the game and records it in D1", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host, { difficulty: "expert" });
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");

		b.send({
			type: "place",
			cell: 0,
			digit: Number(NEARLY.solution[0]) === 1 ? 2 : 1,
		});
		await a.next("mistake");
		for (const cell of [0, 1, 2]) {
			(cell === 1 ? b : a).send({
				type: "place",
				cell,
				digit: Number(NEARLY.solution[cell]),
			});
		}
		const over = await a.next("game_over");
		expect(over.results).toHaveLength(2);
		const mine = over.results.find((r) => r.userId === host.userId);
		expect(mine).toMatchObject({ placements: 2, mistakes: 0, rank: null });
		expect(mine?.scoreMs).toBeGreaterThanOrEqual(10_000);
		expect(over.results.find((r) => r.userId === friend.userId)).toMatchObject({
			placements: 1,
			mistakes: 1,
		});
		await b.next("game_over");

		const game = await env.DB.prepare("SELECT * FROM games WHERE room_code = ?")
			.bind(code)
			.first<Record<string, unknown>>();
		expect(game).toMatchObject({
			puzzle_id: "t-expert",
			mode: "coop",
			difficulty: "expert",
			status: "won",
			mistakes: 1,
		});
		const players = await env.DB.prepare(
			"SELECT user_id, placements, mistakes FROM game_players WHERE game_id = ? ORDER BY placements",
		)
			.bind(game?.id)
			.all();
		expect(players.results).toEqual([
			{ user_id: friend.userId, placements: 1, mistakes: 1 },
			{ user_id: host.userId, placements: 2, mistakes: 0 },
		]);

		// No more moves once finished; reconnecting shows the results.
		a.send({ type: "note", cell: 0, digit: 1 });
		expect(await a.next("error")).toMatchObject({ code: "not_playing" });
		a.send({ type: "resync" });
		const snap = await a.next("snapshot");
		expect(snap.status).toBe("finished");
		expect(snap.results).toHaveLength(2);
	});

	it("marks players disconnected and keeps them listed", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");
		await b.close();
		expect(await a.next("player_left")).toEqual({
			type: "player_left",
			userId: friend.userId,
		});
		a.send({ type: "resync" });
		const snap = await a.next("snapshot");
		expect(
			snap.players.find((p) => p.userId === friend.userId)?.connected,
		).toBe(false);
	});

	it("a hint reveals the cell to everyone and adds a 30 s penalty", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host, { difficulty: "expert" });
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");

		a.send({ type: "hint", cell: 0 });
		expect(await b.next("applied")).toEqual({
			type: "applied",
			version: 1,
			cell: 0,
			digit: Number(NEARLY.solution[0]),
			by: host.userId,
			hint: true,
		});
		a.send({ type: "hint", cell: 0 });
		expect(await a.next("error")).toMatchObject({ code: "invalid_move" });

		b.send({ type: "place", cell: 1, digit: Number(NEARLY.solution[1]) });
		b.send({ type: "place", cell: 2, digit: Number(NEARLY.solution[2]) });
		const over = await a.next("game_over");
		const mine = over.results.find((r) => r.userId === host.userId);
		expect(mine).toMatchObject({ hints: 1, placements: 0 });
		expect(mine?.scoreMs).toBeGreaterThanOrEqual(30_000);
		a.send({ type: "resync" });
		expect((await a.next("snapshot")).hints).toBe(1);
	});

	it("starts the clock on the first move, not on create or join", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		expect((await a.next("snapshot")).startedAt).toBeNull();
		// Joining doesn't start (or restart) anything.
		const b = await connect(code, friend);
		expect((await b.next("snapshot")).startedAt).toBeNull();
		a.send({ type: "select", cell: 40 });
		await b.next("presence");
		b.send({ type: "resync" });
		expect((await b.next("snapshot")).startedAt).toBeNull();

		const before = Date.now();
		b.send({ type: "note", cell: CELL, digit: 1 });
		const started = await a.next("status");
		expect(started).toMatchObject({ type: "status", status: "playing" });
		expect(started.startedAt).toBeGreaterThanOrEqual(before);
		await a.next("notes");

		// Later moves and late joiners keep the original start.
		a.send({ type: "place", cell: CELL, digit: RIGHT });
		await a.next("applied");
		const late = await connect(code, await newGuest());
		expect((await late.next("snapshot")).startedAt).toBe(started.startedAt);
		expect(await a.none("status")).toBe(true);
	});

	it("a wrong first digit also starts the clock", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		await a.next("snapshot");
		a.send({ type: "place", cell: CELL, digit: WRONG });
		expect((await a.next("status")).startedAt).toBeTypeOf("number");
		await a.next("mistake");
	});
});
