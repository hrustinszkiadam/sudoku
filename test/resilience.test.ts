import {
	evictDurableObject,
	runDurableObjectAlarm,
	runInDurableObject,
} from "cloudflare:test";
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
import { ROOM_IDLE_TTL_MS } from "../src/shared/constants";
import { EASY } from "../src/shared/sudoku/fixtures";
import type { GameRoom } from "../src/worker/room/GameRoom";
import {
	api,
	closeAllSockets,
	connect,
	createRoomFor,
	mockTurnstile,
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

const CELL = 2;
const RIGHT = Number(EASY.solution[CELL]);

describe("connections", () => {
	it("newer tab wins: the older socket is closed with 4000", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const watcher = await connect(code, friend);
		await watcher.next("snapshot");

		const first = await connect(code, host);
		await first.next("snapshot");
		await watcher.next("player_joined");
		const second = await connect(code, host);
		const snap = await second.next("snapshot");

		expect(await first.next("error")).toMatchObject({ code: "replaced" });
		expect((await first.waitClosed()).code).toBe(4000);
		expect(snap.players.filter((p) => p.userId === host.userId)).toHaveLength(
			1,
		);
		// The replaced tab does not mark the user as gone.
		expect(await watcher.none("player_left", 150)).toBe(true);
		second.send({ type: "resync" });
		const after = await second.next("snapshot");
		expect(after.players.find((p) => p.userId === host.userId)?.connected).toBe(
			true,
		);
	});

	it("caps rooms at 8 players", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		for (let i = 0; i < 8; i++) {
			const ws = await connect(code, i === 0 ? host : await newGuest());
			await ws.next("snapshot");
		}
		const ninth = await newGuest();
		const res = await api(`/api/rooms/${code}/ws`, ninth, {
			headers: { Upgrade: "websocket" },
		});
		expect(res.status).toBe(409);
		// Existing players can still reconnect.
		const again = await connect(code, host);
		await again.next("snapshot");
	});

	it("validates identity inside the Durable Object too", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const stub = env.GAME_ROOM.getByName(code);
		const res = await stub.fetch("https://do/ws", {
			headers: {
				Upgrade: "websocket",
				"X-User-Id": crypto.randomUUID(),
				"X-User-Name": encodeURIComponent("admin"),
			},
		});
		expect(res.status).toBe(400);
	});
});

describe("message limits", () => {
	it("rejects messages over 1 KB and invalid messages", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");

		ws.send(JSON.stringify({ type: "resync", pad: "x".repeat(1100) }));
		expect(await ws.next("error")).toMatchObject({ code: "message_too_large" });
		ws.send("{not json");
		expect(await ws.next("error")).toMatchObject({ code: "invalid_message" });
		ws.send({ type: "place", cell: 99, digit: 1 });
		expect(await ws.next("error")).toMatchObject({ code: "invalid_message" });
		ws.send({ type: "start" });
		expect(await ws.next("error")).toMatchObject({ code: "invalid_message" });
	});

	it("applies a per-connection token bucket (burst 20)", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");
		for (let i = 0; i < 30; i++) ws.send({ type: "resync" });
		expect(await ws.next("error")).toMatchObject({ code: "rate_limited" });
		const snapshots = ws.received.filter((m) => m.type === "snapshot").length;
		expect(snapshots).toBeLessThanOrEqual(1 + 22);
	});
});

describe("Rate Limiting bindings", () => {
	it("limits room creation per user", async () => {
		const host = await newGuest();
		const statuses: number[] = [];
		for (let i = 0; i < 12; i++) {
			const res = await api("/api/rooms", host, {
				method: "POST",
				body: JSON.stringify({
					mode: "coop",
					difficulty: "easy",
					turnstileToken: "t",
				}),
			});
			statuses.push(res.status);
		}
		expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
		expect(statuses).toContain(429);
	});

	it("limits guest session creation per IP", async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 22; i++) {
			const res = await api("/api/session", null, {
				headers: { "cf-connecting-ip": "203.0.113.7" },
			});
			statuses.push(res.status);
		}
		expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
		expect(statuses).toContain(429);
	});
});

describe("hibernation and eviction", () => {
	it("evicting the DO mid-game preserves board, players and version; sockets keep working", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host);
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");

		a.send({ type: "select", cell: 40 });
		await b.next("presence");
		a.send({ type: "note", cell: 3, digit: 9 });
		await b.next("notes");
		a.send({ type: "place", cell: CELL, digit: RIGHT });
		expect((await b.next("applied")).version).toBe(2);
		await a.next("applied");

		await evictDurableObject(env.GAME_ROOM.getByName(code));

		b.send({ type: "resync" });
		const snap = await b.next("snapshot");
		expect(snap.version).toBe(2);
		expect(snap.board[CELL]).toBe(String(RIGHT));
		expect(snap.notes[3]).toBe(1 << 8);
		expect(
			snap.players.map((p) => [p.userId, p.connected, p.placements]),
		).toEqual([
			[host.userId, true, 1],
			[friend.userId, true, 0],
		]);
		// Per-socket identity and presence survive via attachments.
		expect(snap.players.find((p) => p.userId === host.userId)?.selected).toBe(
			40,
		);

		b.send({ type: "place", cell: 3, digit: Number(EASY.solution[3]) });
		const applied = await a.next("applied");
		expect(applied).toMatchObject({ version: 3, by: friend.userId });
	});
});

describe("cleanup alarm", () => {
	it("deletes a stale empty room and records the abandoned game", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");
		ws.send({ type: "place", cell: CELL, digit: RIGHT });
		await ws.next("applied");
		await ws.close();

		const stub = env.GAME_ROOM.getByName(code);
		await runInDurableObject(stub, (room: GameRoom) => {
			room.setMeta({ lastActivityAt: Date.now() - ROOM_IDLE_TTL_MS - 1000 });
		});
		expect(await runDurableObjectAlarm(stub)).toBe(true);
		expect(await stub.preview()).toEqual({ exists: false });
		await runInDurableObject(stub, async (_room: GameRoom, state) => {
			expect(await state.storage.getAlarm()).toBeNull();
		});

		const game = await env.DB.prepare(
			"SELECT status FROM games WHERE room_code = ?",
		)
			.bind(code)
			.first<{ status: string }>();
		expect(game?.status).toBe("abandoned");
	});

	it("reschedules for an active room", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");

		const stub = env.GAME_ROOM.getByName(code);
		const lastActivity = Date.now() - 1000;
		await runInDurableObject(stub, (room: GameRoom) => {
			room.setMeta({ lastActivityAt: lastActivity });
		});
		expect(await runDurableObjectAlarm(stub)).toBe(true);
		expect((await stub.preview()).exists).toBe(true);
		await runInDurableObject(stub, async (_room: GameRoom, state) => {
			expect(await state.storage.getAlarm()).toBe(
				lastActivity + ROOM_IDLE_TTL_MS,
			);
		});
	});

	it("keeps a stale room alive while someone is connected", async () => {
		const host = await newGuest();
		const code = await createRoomFor(host);
		const ws = await connect(code, host);
		await ws.next("snapshot");
		const stub = env.GAME_ROOM.getByName(code);
		await runInDurableObject(stub, (room: GameRoom) => {
			room.setMeta({ lastActivityAt: Date.now() - ROOM_IDLE_TTL_MS - 1000 });
		});
		await runDurableObjectAlarm(stub);
		expect((await stub.preview()).exists).toBe(true);
		await runInDurableObject(stub, async (_room: GameRoom, state) => {
			expect(await state.storage.getAlarm()).toBeGreaterThan(Date.now());
		});
	});
});
