import type { Difficulty, Mode } from "../../shared/constants";
import type { RoomStatus } from "../../shared/protocol";

/** The single `meta` row, cached in memory by GameRoom. */
export interface Meta {
	code: string;
	mode: Mode;
	difficulty: Difficulty;
	puzzleId: string;
	givens: string;
	/** Never leaves the Durable Object. */
	solution: string;
	/** Co-op shared board; equals `givens` in race mode. */
	board: string;
	/** Co-op shared notes (81 masks). */
	notes: number[];
	status: RoomStatus;
	hostId: string;
	version: number;
	mistakes: number;
	/** Co-op: hints used by the room. */
	hints: number;
	createdAt: number;
	startsAt: number | null;
	startedAt: number | null;
	finishedAt: number | null;
	lastActivityAt: number;
}

export interface PlayerRow {
	userId: string;
	name: string;
	/** Pencil 1-8, stored in the legacy `color` column. */
	pencil: number;
	joinedAt: number;
	connected: boolean;
	placements: number;
	mistakes: number;
	hints: number;
	/** Race: the player's own board. */
	board: string | null;
	/** Race: when the player completed their board. */
	finishedAt: number | null;
}

const META_COLUMNS = {
	code: "code",
	mode: "mode",
	difficulty: "difficulty",
	puzzleId: "puzzle_id",
	givens: "givens",
	solution: "solution",
	board: "board",
	notes: "notes",
	status: "status",
	hostId: "host_id",
	version: "version",
	mistakes: "mistakes",
	hints: "hints",
	createdAt: "created_at",
	startsAt: "starts_at",
	startedAt: "started_at",
	finishedAt: "finished_at",
	lastActivityAt: "last_activity_at",
} as const satisfies Record<keyof Meta, string>;

const PLAYER_COLUMNS = {
	userId: "user_id",
	name: "name",
	pencil: "color",
	joinedAt: "joined_at",
	connected: "connected",
	placements: "placements",
	mistakes: "mistakes",
	hints: "hints",
	board: "board",
	finishedAt: "finished_at",
} as const satisfies Record<keyof PlayerRow, string>;

export function createTables(sql: SqlStorage): void {
	sql.exec(`
		CREATE TABLE IF NOT EXISTS meta (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			code TEXT NOT NULL,
			mode TEXT NOT NULL,
			difficulty TEXT NOT NULL,
			puzzle_id TEXT NOT NULL,
			givens TEXT NOT NULL,
			solution TEXT NOT NULL,
			board TEXT NOT NULL,
			notes TEXT NOT NULL,
			status TEXT NOT NULL,
			host_id TEXT NOT NULL,
			version INTEGER NOT NULL DEFAULT 0,
			mistakes INTEGER NOT NULL DEFAULT 0,
			hints INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			starts_at INTEGER,
			started_at INTEGER,
			finished_at INTEGER,
			last_activity_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS players (
			user_id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			color TEXT NOT NULL,
			joined_at INTEGER NOT NULL,
			connected INTEGER NOT NULL DEFAULT 0,
			placements INTEGER NOT NULL DEFAULT 0,
			mistakes INTEGER NOT NULL DEFAULT 0,
			hints INTEGER NOT NULL DEFAULT 0,
			board TEXT,
			finished_at INTEGER
		);
	`);
	// Rooms created before hints existed.
	addColumnIfMissing(sql, "meta", "hints", "INTEGER NOT NULL DEFAULT 0");
	addColumnIfMissing(sql, "players", "hints", "INTEGER NOT NULL DEFAULT 0");
}

function addColumnIfMissing(
	sql: SqlStorage,
	table: "meta" | "players",
	column: string,
	type: string,
): void {
	const columns = sql
		.exec<{ name: string }>(`SELECT name FROM pragma_table_info('${table}')`)
		.toArray();
	if (!columns.some((c) => c.name === column)) {
		sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
	}
}

type Row = Record<string, SqlStorageValue>;

const num = (v: SqlStorageValue): number => Number(v);
const numOrNull = (v: SqlStorageValue): number | null =>
	v === null ? null : Number(v);

function toMeta(r: Row): Meta {
	return {
		code: String(r.code),
		mode: String(r.mode) as Mode,
		difficulty: String(r.difficulty) as Difficulty,
		puzzleId: String(r.puzzle_id),
		givens: String(r.givens),
		solution: String(r.solution),
		board: String(r.board),
		notes: JSON.parse(String(r.notes)) as number[],
		status: String(r.status) as RoomStatus,
		hostId: String(r.host_id),
		version: num(r.version),
		mistakes: num(r.mistakes),
		hints: num(r.hints),
		createdAt: num(r.created_at),
		startsAt: numOrNull(r.starts_at),
		startedAt: numOrNull(r.started_at),
		finishedAt: numOrNull(r.finished_at),
		lastActivityAt: num(r.last_activity_at),
	};
}

/** Hex colours from before pencils, in their old join order. */
const LEGACY_COLORS = [
	"#e11d48",
	"#2563eb",
	"#16a34a",
	"#d97706",
	"#9333ea",
	"#0891b2",
	"#db2777",
	"#65a30d",
];

function toPencil(value: unknown): number {
	const n = Number(value);
	if (Number.isInteger(n) && n >= 1 && n <= 8) return n;
	return LEGACY_COLORS.indexOf(String(value)) + 1 || 1;
}

function toPlayer(r: Row): PlayerRow {
	return {
		userId: String(r.user_id),
		name: String(r.name),
		pencil: toPencil(r.color),
		joinedAt: num(r.joined_at),
		connected: num(r.connected) === 1,
		placements: num(r.placements),
		mistakes: num(r.mistakes),
		hints: num(r.hints),
		board: r.board === null ? null : String(r.board),
		finishedAt: numOrNull(r.finished_at),
	};
}

const toSql = (v: unknown): SqlStorageValue => {
	if (typeof v === "boolean") return v ? 1 : 0;
	if (Array.isArray(v)) return JSON.stringify(v);
	return v as SqlStorageValue;
};

/** Builds `col = ?, ...` for the given partial object. */
function assignments<K extends string>(
	columns: Record<K, string>,
	patch: Partial<Record<K, unknown>>,
): { set: string; values: SqlStorageValue[] } {
	const keys = Object.keys(patch) as K[];
	return {
		set: keys.map((k) => `${columns[k]} = ?`).join(", "),
		values: keys.map((k) => toSql(patch[k])),
	};
}

export function readMeta(sql: SqlStorage): Meta | null {
	const rows = sql.exec<Row>("SELECT * FROM meta WHERE id = 1").toArray();
	return rows.length ? toMeta(rows[0]) : null;
}

export function insertMeta(sql: SqlStorage, meta: Meta): void {
	const keys = Object.keys(META_COLUMNS) as (keyof Meta)[];
	sql.exec(
		`INSERT INTO meta (id, ${keys.map((k) => META_COLUMNS[k]).join(", ")})
		 VALUES (1, ${keys.map(() => "?").join(", ")})`,
		...keys.map((k) => toSql(meta[k])),
	);
}

/** One row write. */
export function updateMeta(sql: SqlStorage, patch: Partial<Meta>): void {
	const { set, values } = assignments(META_COLUMNS, patch);
	if (set) sql.exec(`UPDATE meta SET ${set} WHERE id = 1`, ...values);
}

export function listPlayers(sql: SqlStorage): PlayerRow[] {
	return sql
		.exec<Row>("SELECT * FROM players ORDER BY joined_at, user_id")
		.toArray()
		.map(toPlayer);
}

export function getPlayer(sql: SqlStorage, userId: string): PlayerRow | null {
	const rows = sql
		.exec<Row>("SELECT * FROM players WHERE user_id = ?", userId)
		.toArray();
	return rows.length ? toPlayer(rows[0]) : null;
}

export function insertPlayer(sql: SqlStorage, p: PlayerRow): void {
	const keys = Object.keys(PLAYER_COLUMNS) as (keyof PlayerRow)[];
	sql.exec(
		`INSERT INTO players (${keys.map((k) => PLAYER_COLUMNS[k]).join(", ")})
		 VALUES (${keys.map(() => "?").join(", ")})`,
		...keys.map((k) => toSql(p[k])),
	);
}

/** One row write. */
export function updatePlayer(
	sql: SqlStorage,
	userId: string,
	patch: Partial<PlayerRow>,
): void {
	const { set, values } = assignments(PLAYER_COLUMNS, patch);
	if (set) {
		sql.exec(`UPDATE players SET ${set} WHERE user_id = ?`, ...values, userId);
	}
}

/** Adds `delta` to a player's counter without a read. */
export function incrementPlayer(
	sql: SqlStorage,
	userId: string,
	column: "placements" | "mistakes" | "hints",
	patch: Partial<PlayerRow> = {},
): void {
	const { set, values } = assignments(PLAYER_COLUMNS, patch);
	sql.exec(
		`UPDATE players SET ${column} = ${column} + 1${set ? `, ${set}` : ""} WHERE user_id = ?`,
		...values,
		userId,
	);
}
