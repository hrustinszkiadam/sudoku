import { Hono } from "hono";
import {
	ERROR_CODES,
	ROOM_CODE_ALPHABET,
	ROOM_CODE_LENGTH,
} from "../../shared/constants";
import { getDb } from "../db/client";
import {
	dailyLeaderboard,
	ensureDailyPuzzle,
	getPuzzle,
	utcDate,
} from "../db/queries";
import { type AppEnv, apiError } from "../http";
import { requireSession } from "../middleware/session";
import { createRoom } from "./rooms";

/** The daily is one medium puzzle per UTC day, played solo in co-op mode. */
export const DAILY_DIFFICULTY = "medium" as const;

/** Deterministic room code per user and day, so revisiting returns the same room. */
export async function dailyRoomCode(
	userId: string,
	date: string,
): Promise<string> {
	const data = new TextEncoder().encode(`daily:${date}:${userId}`);
	const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
	return Array.from(hash.slice(0, ROOM_CODE_LENGTH))
		.map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length])
		.join("");
}

export const dailyRoutes = new Hono<AppEnv>().get(
	"/",
	requireSession,
	async (c) => {
		const db = getDb(c.env.DB);
		const userId = c.get("userId");
		const date = utcDate(Date.now());
		const puzzleId = await ensureDailyPuzzle(db, date);
		const puzzle = puzzleId ? await getPuzzle(db, puzzleId) : null;
		if (!puzzle)
			return apiError(
				c,
				503,
				ERROR_CODES.noPuzzles,
				"No daily puzzle available",
			);

		const params = {
			mode: "coop" as const,
			difficulty: DAILY_DIFFICULTY,
			puzzleId: puzzle.id,
			givens: puzzle.givens,
			solution: puzzle.solution,
			hostId: userId,
		};
		const preferred = await dailyRoomCode(userId, date);
		const stub = c.env.GAME_ROOM.getByName(preferred);
		let code: string | null = preferred;
		const { created } = await stub.init({ ...params, code: preferred });
		if (!created) {
			const owner = await stub.owner();
			// A (very unlikely) collision with someone else's room: use a random code.
			if (owner?.hostId !== userId || owner.puzzleId !== puzzle.id) {
				code = await createRoom(c.env, params);
			}
		}
		if (!code)
			return apiError(
				c,
				503,
				ERROR_CODES.internal,
				"Could not create the daily room",
			);

		return c.json({
			date,
			difficulty: DAILY_DIFFICULTY,
			code,
			leaderboard: await dailyLeaderboard(db, puzzle.id, date),
		});
	},
);
