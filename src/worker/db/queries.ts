import { and, desc, eq, gt, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { Difficulty, Mode } from "../../shared/constants";
import type { Db } from "./client";
import { dailyPuzzles, gamePlayers, games, puzzles, users } from "./schema";

export interface PuzzleRow {
	id: string;
	givens: string;
	solution: string;
}

/**
 * Random puzzle without scanning the table: pick a random rowid between the
 * difficulty's min and max (both index lookups), then take the next existing row.
 */
export async function pickRandomPuzzle(
	db: Db,
	difficulty: Difficulty,
	rand: () => number = Math.random,
): Promise<PuzzleRow | null> {
	const [range] = await db
		.select({
			lo: sql<number | null>`min(rowid)`,
			hi: sql<number | null>`max(rowid)`,
		})
		.from(puzzles)
		.where(eq(puzzles.difficulty, difficulty));
	if (!range || range.lo === null || range.hi === null) return null;
	const target = range.lo + Math.floor(rand() * (range.hi - range.lo + 1));
	const [row] = await db
		.select({
			id: puzzles.id,
			givens: puzzles.givens,
			solution: puzzles.solution,
		})
		.from(puzzles)
		.where(and(eq(puzzles.difficulty, difficulty), gte(sql`rowid`, target)))
		.orderBy(sql`rowid`)
		.limit(1);
	return row ?? null;
}

export async function getPuzzle(db: Db, id: string): Promise<PuzzleRow | null> {
	const [row] = await db
		.select({
			id: puzzles.id,
			givens: puzzles.givens,
			solution: puzzles.solution,
		})
		.from(puzzles)
		.where(eq(puzzles.id, id))
		.limit(1);
	return row ?? null;
}

// ---------------------------------------------------------------------------
// Daily puzzle
// ---------------------------------------------------------------------------

/** UTC date as YYYY-MM-DD. */
export const utcDate = (ms: number): string =>
	new Date(ms).toISOString().slice(0, 10);

export async function getDailyPuzzleId(
	db: Db,
	date: string,
): Promise<string | null> {
	const [row] = await db
		.select({ puzzleId: dailyPuzzles.puzzleId })
		.from(dailyPuzzles)
		.where(eq(dailyPuzzles.date, date))
		.limit(1);
	return row?.puzzleId ?? null;
}

/**
 * Picks a medium puzzle for `date` if none is set yet. Starting from a random
 * rowid, it takes the next puzzle never used as a daily (wrapping around),
 * and only repeats once every one has been used. Idempotent and safe to race.
 */
export async function ensureDailyPuzzle(
	db: Db,
	date: string,
	rand: () => number = Math.random,
): Promise<string | null> {
	const existing = await getDailyPuzzleId(db, date);
	if (existing) return existing;

	const any = await pickRandomPuzzle(db, "medium", rand);
	if (!any) return null;
	const [start] = await db
		.select({ rowid: sql<number>`rowid` })
		.from(puzzles)
		.where(eq(puzzles.id, any.id));
	const unused = sql`NOT EXISTS (SELECT 1 FROM ${dailyPuzzles} WHERE ${dailyPuzzles.puzzleId} = ${puzzles.id})`;
	const fresh = async (from: "after" | "before") => {
		const [row] = await db
			.select({ id: puzzles.id })
			.from(puzzles)
			.where(
				and(
					eq(puzzles.difficulty, "medium"),
					from === "after"
						? gte(sql`rowid`, start.rowid)
						: lt(sql`rowid`, start.rowid),
					unused,
				),
			)
			.orderBy(sql`rowid`)
			.limit(1);
		return row?.id ?? null;
	};
	const puzzleId = (await fresh("after")) ?? (await fresh("before")) ?? any.id;

	await db
		.insert(dailyPuzzles)
		.values({ date, puzzleId })
		.onConflictDoNothing();
	return getDailyPuzzleId(db, date);
}

// ---------------------------------------------------------------------------
// Leaderboards and history
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
	userId: string;
	name: string;
	bestMs: number;
	games: number;
}

/** Best score_ms per user for a difficulty and mode (won games, players who placed digits). */
export async function leaderboard(
	db: Db,
	difficulty: Difficulty,
	mode: Mode,
	limit = 50,
): Promise<LeaderboardRow[]> {
	return db
		.select({
			userId: gamePlayers.userId,
			name: sql<string>`coalesce(${users.name}, max(${gamePlayers.name}))`,
			bestMs: sql<number>`min(${gamePlayers.scoreMs})`,
			games: sql<number>`count(*)`,
		})
		.from(gamePlayers)
		.innerJoin(games, eq(games.id, gamePlayers.gameId))
		.leftJoin(users, eq(users.id, gamePlayers.userId))
		.where(
			and(
				eq(games.difficulty, difficulty),
				eq(games.mode, mode),
				eq(games.status, "won"),
				isNotNull(gamePlayers.scoreMs),
				gt(gamePlayers.placements, 0),
			),
		)
		.groupBy(gamePlayers.userId)
		.orderBy(sql`min(${gamePlayers.scoreMs})`)
		.limit(limit);
}

/** Today's best times on the daily puzzle. */
export async function dailyLeaderboard(
	db: Db,
	puzzleId: string,
	date: string,
	limit = 20,
): Promise<LeaderboardRow[]> {
	const dayStart = Date.parse(`${date}T00:00:00Z`);
	return db
		.select({
			userId: gamePlayers.userId,
			name: sql<string>`coalesce(${users.name}, max(${gamePlayers.name}))`,
			bestMs: sql<number>`min(${gamePlayers.scoreMs})`,
			games: sql<number>`count(*)`,
		})
		.from(gamePlayers)
		.innerJoin(games, eq(games.id, gamePlayers.gameId))
		.leftJoin(users, eq(users.id, gamePlayers.userId))
		.where(
			and(
				eq(games.puzzleId, puzzleId),
				eq(games.status, "won"),
				gte(games.finishedAt, dayStart),
				lt(games.finishedAt, dayStart + 86_400_000),
				isNotNull(gamePlayers.scoreMs),
				gt(gamePlayers.placements, 0),
			),
		)
		.groupBy(gamePlayers.userId)
		.orderBy(sql`min(${gamePlayers.scoreMs})`)
		.limit(limit);
}

export async function history(db: Db, userId: string, limit = 20) {
	return db
		.select({
			gameId: games.id,
			roomCode: games.roomCode,
			mode: games.mode,
			difficulty: games.difficulty,
			status: games.status,
			startedAt: games.startedAt,
			finishedAt: games.finishedAt,
			placements: gamePlayers.placements,
			mistakes: gamePlayers.mistakes,
			finishMs: gamePlayers.finishMs,
			scoreMs: gamePlayers.scoreMs,
			rank: gamePlayers.rank,
		})
		.from(gamePlayers)
		.innerJoin(games, eq(games.id, gamePlayers.gameId))
		.where(eq(gamePlayers.userId, userId))
		.orderBy(desc(games.finishedAt))
		.limit(limit);
}
