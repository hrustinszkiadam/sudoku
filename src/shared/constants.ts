export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const MODES = ["coop", "race"] as const;
export type Mode = (typeof MODES)[number];

export const MAX_PLAYERS = 8;
export const MAX_MESSAGE_BYTES = 1024;
export const NAME_MAX_LENGTH = 20;

export const ROOM_CODE_LENGTH = 6;
/** Unambiguous alphabet: no 0, O, 1, I or L. */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Token bucket per WebSocket connection. */
export const RATE_BURST = 20;
export const RATE_REFILL_PER_SEC = 10;

export const PING_INTERVAL_MS = 30_000;
export const MISTAKE_PENALTY_MS = 10_000;
export const RACE_COUNTDOWN_MS = 3_000;
export const RACE_MAX_DURATION_MS = 2 * 60 * 60 * 1000;
export const ROOM_IDLE_TTL_MS = 24 * 60 * 60 * 1000;

/** Close code sent to an older socket when the same user connects again. */
export const CLOSE_REPLACED = 4000;

/** Player colours, assigned in order. Each pairs with a distinct name label so colour is never the only signal. */
export const PLAYER_COLORS = [
	"#e11d48",
	"#2563eb",
	"#16a34a",
	"#d97706",
	"#9333ea",
	"#0891b2",
	"#db2777",
	"#65a30d",
] as const;

/** Stable error codes sent to clients. */
export const ERROR_CODES = {
	badRequest: "bad_request",
	unauthorized: "unauthorized",
	notFound: "not_found",
	roomFull: "room_full",
	rateLimited: "rate_limited",
	turnstileFailed: "turnstile_failed",
	invalidMessage: "invalid_message",
	messageTooLarge: "message_too_large",
	notPlaying: "not_playing",
	invalidMove: "invalid_move",
	notHost: "not_host",
	notEnoughPlayers: "not_enough_players",
	gameStarted: "game_started",
	replaced: "replaced",
	upgradeRequired: "upgrade_required",
	noPuzzles: "no_puzzles",
	internal: "internal_error",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
