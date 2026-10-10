import { createScheduledController } from "cloudflare:test";
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
import { getDb } from "../src/worker/db/client";
import { ensureDailyPuzzle, utcDate } from "../src/worker/db/queries";
import { scheduled } from "../src/worker/index";
import {
	api,
	closeAllSockets,
	connect,
	type Guest,
	mockTurnstile,
	newGuest,
	seedPuzzles,
} from "./helpers";

beforeAll(async () => {
	await seedPuzzles();
	// A few more medium puzzles so consecutive days can differ.
	await env.DB.batch(
		[1, 2, 3, 4].map((n) =>
			env.DB.prepare(
				"INSERT OR IGNORE INTO puzzles (id, givens, solution, difficulty, score, created_at) VALUES (?, ?, ?, 'medium', 1, 0)",
			).bind(`t-medium-${n}`, EASY.givens, EASY.solution),
		),
	);
});
beforeEach(() => {
	mockTurnstile();
});
afterEach(async () => {
	vi.restoreAllMocks();
	await closeAllSockets();
});

const dailyRow = (date: string) =>
	env.DB.prepare("SELECT puzzle_id FROM daily_puzzles WHERE date = ?")
		.bind(date)
		.first<{ puzzle_id: string }>();

describe("daily puzzle", () => {
	it("cron picks today's and tomorrow's medium puzzles", async () => {
		const at = Date.UTC(2031, 4, 6, 0, 5);
		await scheduled(
			createScheduledController({ scheduledTime: at, cron: "5 0 * * *" }),
			env,
		);
		const today = await dailyRow("2031-05-06");
		const tomorrow = await dailyRow("2031-05-07");
		expect(today?.puzzle_id).toMatch(/^t-medium/);
		expect(tomorrow?.puzzle_id).toMatch(/^t-medium/);
		// Fresh puzzles are preferred, so consecutive days differ.
		expect(tomorrow?.puzzle_id).not.toBe(today?.puzzle_id);

		// Running again (or the next day's run) keeps the existing pick.
		await scheduled(
			createScheduledController({
				scheduledTime: at + 60_000,
				cron: "5 0 * * *",
			}),
			env,
		);
		expect((await dailyRow("2031-05-07"))?.puzzle_id).toBe(tomorrow?.puzzle_id);
	});

	it("uses UTC dates, changing at midnight", async () => {
		expect(utcDate(Date.UTC(2031, 0, 1, 23, 59, 59))).toBe("2031-01-01");
		expect(utcDate(Date.UTC(2031, 0, 2, 0, 0, 0))).toBe("2031-01-02");
		const db = getDb(env.DB);
		const a = await ensureDailyPuzzle(db, "2031-01-01");
		const b = await ensureDailyPuzzle(db, "2031-01-02");
		expect(a).not.toBeNull();
		expect(b).not.toBe(a);
	});

	it("GET /api/daily gives each player their own stable daily room", async () => {
		const alice = await newGuest();
		const bob = await newGuest();
		const first = await (await api("/api/daily", alice)).json<{
			code: string;
			date: string;
			difficulty: string;
		}>();
		expect(first.date).toBe(utcDate(Date.now()));
		expect(first.difficulty).toBe("medium");
		expect(first.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

		const again = await (await api("/api/daily", alice)).json<{
			code: string;
		}>();
		expect(again.code).toBe(first.code);
		const other = await (await api("/api/daily", bob)).json<{ code: string }>();
		expect(other.code).not.toBe(first.code);

		const ws = await connect(first.code, alice);
		const snap = await ws.next("snapshot");
		expect(snap).toMatchObject({
			mode: "coop",
			difficulty: "medium",
			hostId: alice.userId,
		});
		expect((await dailyRow(first.date))?.puzzle_id).toMatch(/^t-medium/);
	});
});

async function recordWin(
	guest: Guest,
	opts: {
		difficulty: string;
		mode: string;
		scoreMs: number;
		puzzleId?: string;
		finishedAt?: number;
	},
) {
	const id = crypto.randomUUID();
	const finishedAt = opts.finishedAt ?? Date.now();
	await env.DB.batch([
		env.DB.prepare(
			"INSERT INTO games (id, room_code, puzzle_id, mode, difficulty, started_at, finished_at, status, mistakes) VALUES (?, 'ROOM22', ?, ?, ?, ?, ?, 'won', 0)",
		).bind(
			id,
			opts.puzzleId ?? "t-hard",
			opts.mode,
			opts.difficulty,
			finishedAt - opts.scoreMs,
			finishedAt,
		),
		env.DB.prepare(
			"INSERT INTO game_players (game_id, user_id, name, placements, mistakes, finish_ms, score_ms, rank) VALUES (?, ?, ?, 5, 0, ?, ?, NULL)",
		).bind(id, guest.userId, guest.name, opts.scoreMs, opts.scoreMs),
	]);
	return id;
}

describe("leaderboard", () => {
	it("shows the best score_ms per user per difficulty and mode", async () => {
		const [a, b] = [await newGuest(), await newGuest()];
		await recordWin(a, { difficulty: "hard", mode: "race", scoreMs: 90_000 });
		await recordWin(a, { difficulty: "hard", mode: "race", scoreMs: 60_000 });
		await recordWin(b, { difficulty: "hard", mode: "race", scoreMs: 75_000 });
		await recordWin(b, { difficulty: "hard", mode: "coop", scoreMs: 1_000 });
		await recordWin(b, { difficulty: "easy", mode: "race", scoreMs: 1_000 });

		const res = await api("/api/leaderboard?difficulty=hard&mode=race", a);
		const body = await res.json<{
			rows: { userId: string; bestMs: number; games: number }[];
		}>();
		expect(body.rows.map((r) => [r.userId, r.bestMs, r.games])).toEqual([
			[a.userId, 60_000, 2],
			[b.userId, 75_000, 1],
		]);

		const bad = await api("/api/leaderboard?difficulty=impossible", a);
		expect(bad.status).toBe(400);
	});

	it("is cached briefly", async () => {
		const a = await newGuest();
		const first = await (
			await api("/api/leaderboard?difficulty=expert&mode=race", a)
		).json<{
			rows: unknown[];
		}>();
		await recordWin(a, { difficulty: "expert", mode: "race", scoreMs: 5_000 });
		const second = await api("/api/leaderboard?difficulty=expert&mode=race", a);
		expect(second.headers.get("cache-control")).toContain("max-age=30");
		expect((await second.json<{ rows: unknown[] }>()).rows).toEqual(first.rows);
	});
});

describe("GET /api/me/history", () => {
	it("returns the current user's last 20 games, newest first", async () => {
		const me = await newGuest();
		const other = await newGuest();
		for (let i = 0; i < 22; i++) {
			await recordWin(me, {
				difficulty: "easy",
				mode: "coop",
				scoreMs: 1000 + i,
				finishedAt: Date.now() - (22 - i) * 1000,
			});
		}
		await recordWin(other, { difficulty: "easy", mode: "coop", scoreMs: 1 });
		const body = await (await api("/api/me/history", me)).json<{
			games: { scoreMs: number; mode: string }[];
		}>();
		expect(body.games).toHaveLength(20);
		expect(body.games[0].scoreMs).toBe(1021);
		expect(body.games.every((g) => g.scoreMs > 1)).toBe(true);
		expect((await api("/api/me/history", null)).status).toBe(401);
	});
});
