import { z } from "zod";
import { DIFFICULTIES, ERROR_CODES, MODES } from "./constants";

const cell = z.number().int().min(0).max(80);
const digit = z.number().int().min(1).max(9);
const grid = z.string().regex(/^[0-9]{81}$/);
const mask = z.number().int().min(0).max(0x1ff);
const timestamp = z.number().int().nonnegative();

export const STATUSES = ["lobby", "playing", "finished"] as const;
export type RoomStatus = (typeof STATUSES)[number];

// ---------------------------------------------------------------------------
// Client -> server
// ---------------------------------------------------------------------------

export const clientMessageSchema = z.discriminatedUnion("type", [
	z.strictObject({ type: z.literal("place"), cell, digit }),
	z.strictObject({ type: z.literal("note"), cell, digit }),
	z.strictObject({ type: z.literal("clear_notes"), cell }),
	/** Reveal one empty cell, for a score penalty. */
	z.strictObject({ type: z.literal("hint"), cell }),
	z.strictObject({ type: z.literal("select"), cell: cell.nullable() }),
	z.strictObject({ type: z.literal("start") }),
	z.strictObject({ type: z.literal("end") }),
	z.strictObject({ type: z.literal("resync") }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ClientMessageOf<T extends ClientMessage["type"]> = Extract<
	ClientMessage,
	{ type: T }
>;

// ---------------------------------------------------------------------------
// Server -> client
// ---------------------------------------------------------------------------

export const playerSchema = z.object({
	userId: z.string(),
	name: z.string(),
	/** Pencil 1-8 in join order; the client picks the colour per theme. */
	pencil: z.number().int().min(1).max(8),
	connected: z.boolean(),
	selected: cell.nullable(),
	placements: z.number().int(),
	mistakes: z.number().int(),
	hints: z.number().int(),
	filled: z.number().int(),
	finished: z.boolean(),
	/** Race: finish time without penalties, once this player has finished. */
	finishMs: z.number().int().nullable(),
});
export type Player = z.infer<typeof playerSchema>;

export const resultSchema = z.object({
	userId: z.string(),
	name: z.string(),
	placements: z.number().int(),
	mistakes: z.number().int(),
	hints: z.number().int(),
	finishMs: z.number().int().nullable(),
	scoreMs: z.number().int().nullable(),
	rank: z.number().int().nullable(),
});
export type Result = z.infer<typeof resultSchema>;

export const snapshotSchema = z.object({
	type: z.literal("snapshot"),
	version: z.number().int(),
	me: z.string(),
	hostId: z.string(),
	mode: z.enum(MODES),
	difficulty: z.enum(DIFFICULTIES),
	status: z.enum(STATUSES),
	givens: grid,
	/** Co-op: the shared board. Race: the requesting player's own board. */
	board: grid,
	/** Co-op: shared notes. Race: always empty (notes are client-only). */
	notes: z.array(mask).length(81),
	players: z.array(playerSchema),
	mistakes: z.number().int(),
	/** Co-op: the room's hints. Race: the requesting player's own. */
	hints: z.number().int(),
	startsAt: timestamp.nullable(),
	startedAt: timestamp.nullable(),
	finishedAt: timestamp.nullable(),
	/** Final results once the game is over, so reconnecting clients can show them. */
	results: z.array(resultSchema).nullable(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

export const serverMessageSchema = z.discriminatedUnion("type", [
	snapshotSchema,
	z.object({
		type: z.literal("applied"),
		version: z.number().int(),
		cell,
		digit,
		by: z.string(),
		/** True when the digit came from a hint. */
		hint: z.boolean().optional(),
	}),
	z.object({ type: z.literal("mistake"), cell, digit, by: z.string() }),
	z.object({
		type: z.literal("notes"),
		version: z.number().int(),
		cell,
		mask,
		by: z.string(),
	}),
	z.object({
		type: z.literal("presence"),
		userId: z.string(),
		cell: cell.nullable(),
	}),
	z.object({ type: z.literal("player_joined"), player: playerSchema }),
	z.object({ type: z.literal("player_left"), userId: z.string() }),
	z.object({
		type: z.literal("progress"),
		userId: z.string(),
		filled: z.number().int(),
		mistakes: z.number().int(),
		hints: z.number().int(),
	}),
	z.object({
		type: z.literal("status"),
		status: z.enum(STATUSES),
		startsAt: timestamp.optional(),
		/** Co-op: when the first move started the clock. */
		startedAt: timestamp.optional(),
	}),
	z.object({
		type: z.literal("player_finished"),
		userId: z.string(),
		scoreMs: z.number().int(),
		finishMs: z.number().int().optional(),
	}),
	z.object({ type: z.literal("game_over"), results: z.array(resultSchema) }),
	z.object({
		type: z.literal("error"),
		code: z.enum(Object.values(ERROR_CODES) as [string, ...string[]]),
		message: z.string(),
	}),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type ServerMessageOf<T extends ServerMessage["type"]> = Extract<
	ServerMessage,
	{ type: T }
>;

/** Parses a raw client frame; returns null when it is not a valid message. */
export function parseClientMessage(raw: string): ClientMessage | null {
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		return null;
	}
	const result = clientMessageSchema.safeParse(json);
	return result.success ? result.data : null;
}
