import { and, eq, gte, sql } from "drizzle-orm";
import type { Difficulty } from "../../shared/constants";
import type { Db } from "./client";
import { puzzles } from "./schema";

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
