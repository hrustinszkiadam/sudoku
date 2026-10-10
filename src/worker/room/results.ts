import { HINT_PENALTY_MS, MISTAKE_PENALTY_MS } from "../../shared/constants";
import type { Result } from "../../shared/protocol";
import { getDb } from "../db/client";
import { gamePlayers, games } from "../db/schema";
import type { Meta, PlayerRow } from "./storage";

/** Time plus 10 s per mistake and 30 s per hint. */
const penalized = (ms: number, mistakes: number, hints: number) =>
	ms + MISTAKE_PENALTY_MS * mistakes + HINT_PENALTY_MS * hints;

/** Race score: elapsed time since the start, plus penalties. */
export const raceScoreMs = (meta: Meta, p: PlayerRow): number | null =>
	p.finishedAt === null || meta.startsAt === null
		? null
		: penalized(p.finishedAt - meta.startsAt, p.mistakes, p.hints);

/**
 * Co-op: everyone shares the room time and the room's mistakes.
 * Race: finishers ranked by score; non-finishers unranked, after them.
 */
export function buildResults(meta: Meta, players: PlayerRow[]): Result[] {
	if (meta.mode === "coop") {
		const finishMs =
			meta.finishedAt !== null && meta.startedAt !== null
				? meta.finishedAt - meta.startedAt
				: null;
		const scoreMs =
			finishMs === null ? null : penalized(finishMs, meta.mistakes, meta.hints);
		return players.map((p) => ({
			userId: p.userId,
			name: p.name,
			placements: p.placements,
			mistakes: p.mistakes,
			hints: p.hints,
			finishMs: meta.status === "finished" ? finishMs : null,
			scoreMs: meta.status === "finished" ? scoreMs : null,
			rank: null,
		}));
	}

	const scored = players.map((p) => ({
		p,
		scoreMs: raceScoreMs(meta, p),
	}));
	scored.sort((a, b) => {
		if (a.scoreMs === null && b.scoreMs === null) {
			return b.p.placements - a.p.placements;
		}
		if (a.scoreMs === null) return 1;
		if (b.scoreMs === null) return -1;
		return a.scoreMs - b.scoreMs;
	});
	return scored.map(({ p, scoreMs }, i) => ({
		userId: p.userId,
		name: p.name,
		placements: p.placements,
		mistakes: p.mistakes,
		hints: p.hints,
		finishMs:
			p.finishedAt !== null && meta.startsAt !== null
				? p.finishedAt - meta.startsAt
				: null,
		scoreMs,
		rank: scoreMs === null ? null : i + 1,
	}));
}

/** Writes the `games` row and one `game_players` row per player. */
export async function recordGame(
	d1: D1Database,
	meta: Meta,
	results: Result[],
	status: "won" | "abandoned",
): Promise<string> {
	const db = getDb(d1);
	const gameId = crypto.randomUUID();
	const insertGame = db.insert(games).values({
		id: gameId,
		roomCode: meta.code,
		puzzleId: meta.puzzleId,
		mode: meta.mode,
		difficulty: meta.difficulty,
		startedAt: meta.startsAt ?? meta.startedAt ?? meta.createdAt,
		finishedAt: meta.finishedAt ?? Date.now(),
		status,
		mistakes: meta.mistakes,
	});
	if (results.length === 0) {
		await insertGame;
		return gameId;
	}
	await db.batch([
		insertGame,
		db.insert(gamePlayers).values(
			results.map((r) => ({
				gameId,
				userId: r.userId,
				name: r.name,
				placements: r.placements,
				mistakes: r.mistakes,
				finishMs: r.finishMs,
				scoreMs: r.scoreMs,
				rank: r.rank,
			})),
		),
	]);
	return gameId;
}
