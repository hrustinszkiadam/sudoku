import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { DIFFICULTIES, MODES } from "../../shared/constants";

export const puzzles = sqliteTable(
	"puzzles",
	{
		id: text("id").primaryKey(),
		givens: text("givens").notNull(),
		solution: text("solution").notNull(),
		difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
		score: integer("score").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(t) => [index("puzzles_difficulty_idx").on(t.difficulty)],
);

/**
 * Game identities. A guest is linked to an account by switching `kind` to
 * 'account' and setting `auth_user_id` on the same row, so its history stays
 * attached.
 */
export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	kind: text("kind", { enum: ["guest", "account"] })
		.notNull()
		.default("guest"),
	name: text("name").notNull(),
	createdAt: integer("created_at").notNull(),
	authUserId: text("auth_user_id").unique(),
});

export const games = sqliteTable(
	"games",
	{
		id: text("id").primaryKey(),
		roomCode: text("room_code").notNull(),
		puzzleId: text("puzzle_id").notNull(),
		mode: text("mode", { enum: MODES }).notNull(),
		difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
		startedAt: integer("started_at").notNull(),
		finishedAt: integer("finished_at").notNull(),
		status: text("status", { enum: ["won", "abandoned"] }).notNull(),
		mistakes: integer("mistakes").notNull(),
	},
	(t) => [index("games_mode_difficulty_idx").on(t.mode, t.difficulty)],
);

export const gamePlayers = sqliteTable(
	"game_players",
	{
		gameId: text("game_id").notNull(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		placements: integer("placements").notNull(),
		mistakes: integer("mistakes").notNull(),
		finishMs: integer("finish_ms"),
		scoreMs: integer("score_ms"),
		rank: integer("rank"),
	},
	(t) => [
		primaryKey({ columns: [t.gameId, t.userId] }),
		index("game_players_user_idx").on(t.userId),
	],
);

/** One medium puzzle per UTC day. */
export const dailyPuzzles = sqliteTable("daily_puzzles", {
	date: text("date").primaryKey(),
	puzzleId: text("puzzle_id").notNull(),
});

export * from "./auth-schema";
