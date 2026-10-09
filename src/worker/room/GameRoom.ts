import { DurableObject } from "cloudflare:workers";
import {
	CLOSE_REPLACED,
	type Difficulty,
	ERROR_CODES,
	type ErrorCode,
	MAX_MESSAGE_BYTES,
	MAX_PLAYERS,
	type Mode,
	PLAYER_COLORS,
	RACE_MAX_DURATION_MS,
	RATE_BURST,
	RATE_REFILL_PER_SEC,
	ROOM_IDLE_TTL_MS,
} from "../../shared/constants";
import { isValidName } from "../../shared/names";
import {
	type Player,
	parseClientMessage,
	type RoomStatus,
	type ServerMessage,
	type Snapshot,
} from "../../shared/protocol";
import { isGridString } from "../../shared/sudoku/grid";
import { emptyNotes } from "../../shared/sudoku/notes";
import { coopMessage } from "./coop";
import { raceMessage } from "./race";
import { buildResults, recordGame } from "./results";
import {
	createTables,
	getPlayer,
	insertMeta,
	insertPlayer,
	listPlayers,
	type Meta,
	type PlayerRow,
	readMeta,
	updateMeta,
	updatePlayer,
} from "./storage";
import type { Attachment, Room } from "./types";

export interface InitParams {
	code: string;
	mode: Mode;
	difficulty: Difficulty;
	puzzleId: string;
	givens: string;
	solution: string;
	hostId: string;
}

export interface RoomPreview {
	exists: true;
	mode: Mode;
	difficulty: Difficulty;
	status: RoomStatus;
	playerCount: number;
	maxPlayers: number;
}

const OPEN = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Bucket {
	tokens: number;
	at: number;
}

/**
 * One room. State lives in the DO's SQLite (`meta` + `players`); `meta` is
 * cached in memory and reloaded in the constructor after hibernation.
 * Per-socket identity lives in socket attachments. No timers: anything
 * time-based uses the alarm.
 */
export class GameRoom extends DurableObject<Env> implements Room {
	readonly sql: SqlStorage;
	private cached: Meta | null = null;
	/** Token buckets per socket. Reset on wake, which is acceptable. */
	private buckets = new WeakMap<WebSocket, Bucket>();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;
		ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair("ping", "pong"),
		);
		ctx.blockConcurrencyWhile(async () => {
			createTables(this.sql);
			this.cached = readMeta(this.sql);
		});
	}

	// -------------------------------------------------------------------------
	// Room interface used by coop.ts / race.ts
	// -------------------------------------------------------------------------

	get meta(): Meta {
		if (!this.cached) throw new Error("Room is not initialized");
		return this.cached;
	}

	now(): number {
		return Date.now();
	}

	setMeta(patch: Partial<Meta>): void {
		updateMeta(this.sql, patch);
		this.cached = { ...this.meta, ...patch };
	}

	send(ws: WebSocket, msg: ServerMessage): void {
		try {
			ws.send(JSON.stringify(msg));
		} catch {
			// Socket already closing; its close handler cleans up.
		}
	}

	sendToUser(userId: string, msg: ServerMessage): void {
		for (const ws of this.sockets(userId)) this.send(ws, msg);
	}

	broadcast(msg: ServerMessage, except?: WebSocket): void {
		const data = JSON.stringify(msg);
		for (const ws of this.sockets()) {
			if (ws === except) continue;
			try {
				ws.send(data);
			} catch {
				// Ignore sockets that are going away.
			}
		}
	}

	error(ws: WebSocket, code: ErrorCode, message: string): void {
		this.send(ws, { type: "error", code, message });
	}

	sockets(userId?: string): WebSocket[] {
		return this.ctx.getWebSockets(userId).filter((w) => w.readyState === OPEN);
	}

	async finish(): Promise<void> {
		const finishedAt = this.now();
		this.setMeta({
			status: "finished",
			finishedAt,
			lastActivityAt: finishedAt,
		});
		const results = buildResults(this.meta, listPlayers(this.sql));
		const won = results.some((r) => r.scoreMs !== null);
		try {
			await recordGame(
				this.env.DB,
				this.meta,
				results,
				won ? "won" : "abandoned",
			);
		} catch (err) {
			console.error({
				event: "record_game_failed",
				code: this.meta.code,
				message: err instanceof Error ? err.message : String(err),
			});
		}
		console.log({
			event: "game_over",
			code: this.meta.code,
			mode: this.meta.mode,
		});
		this.broadcast({ type: "game_over", results });
	}

	// -------------------------------------------------------------------------
	// RPC
	// -------------------------------------------------------------------------

	async init(params: InitParams): Promise<{ created: boolean }> {
		createTables(this.sql);
		if (this.cached ?? readMeta(this.sql)) return { created: false };
		if (!isGridString(params.givens) || !isGridString(params.solution)) {
			throw new Error("Invalid puzzle");
		}
		const now = this.now();
		const meta: Meta = {
			code: params.code,
			mode: params.mode,
			difficulty: params.difficulty,
			puzzleId: params.puzzleId,
			givens: params.givens,
			solution: params.solution,
			board: params.givens,
			notes: emptyNotes(),
			status: params.mode === "coop" ? "playing" : "lobby",
			hostId: params.hostId,
			version: 0,
			mistakes: 0,
			createdAt: now,
			startsAt: null,
			startedAt: params.mode === "coop" ? now : null,
			finishedAt: null,
			lastActivityAt: now,
		};
		insertMeta(this.sql, meta);
		this.cached = meta;
		await this.ctx.storage.setAlarm(now + ROOM_IDLE_TTL_MS);
		console.log({
			event: "room_created",
			code: params.code,
			mode: params.mode,
		});
		return { created: true };
	}

	async preview(): Promise<RoomPreview | { exists: false }> {
		if (!this.cached) return { exists: false };
		const count = this.sql
			.exec<{ n: number }>("SELECT count(*) AS n FROM players")
			.one().n;
		return {
			exists: true,
			mode: this.meta.mode,
			difficulty: this.meta.difficulty,
			status: this.meta.status,
			playerCount: count,
			maxPlayers: MAX_PLAYERS,
		};
	}

	// -------------------------------------------------------------------------
	// WebSocket lifecycle
	// -------------------------------------------------------------------------

	override async fetch(request: Request): Promise<Response> {
		if (!this.cached) return new Response("Room not found", { status: 404 });
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}
		const userId = request.headers.get("X-User-Id") ?? "";
		let name = "";
		try {
			name = decodeURIComponent(request.headers.get("X-User-Name") ?? "");
		} catch {
			// Falls through to the validation below.
		}
		if (!UUID.test(userId) || !isValidName(name)) {
			return new Response("Invalid identity", { status: 400 });
		}

		const now = this.now();
		const existing = getPlayer(this.sql, userId);
		const players = listPlayers(this.sql);
		if (!existing && players.length >= MAX_PLAYERS) {
			return new Response("Room is full", { status: 409 });
		}
		if (
			!existing &&
			this.meta.mode === "race" &&
			this.meta.status !== "lobby"
		) {
			return new Response("Race already started", { status: 409 });
		}

		// Newer tab wins: close this user's older sockets.
		for (const old of this.ctx.getWebSockets(userId)) {
			old.close(CLOSE_REPLACED, "Replaced by a newer connection");
		}

		const [client, server] = Object.values(new WebSocketPair());
		this.ctx.acceptWebSocket(server, [userId]);
		const attachment: Attachment = { userId, name, selected: null };
		server.serializeAttachment(attachment);

		if (existing) {
			updatePlayer(this.sql, userId, { name, connected: true });
		} else {
			const used = new Set(players.map((p) => p.color));
			insertPlayer(this.sql, {
				userId,
				name,
				color: PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0],
				joinedAt: now,
				connected: true,
				placements: 0,
				mistakes: 0,
				board: this.meta.mode === "race" ? this.meta.givens : null,
				finishedAt: null,
			});
		}
		this.setMeta({ lastActivityAt: now });

		this.send(server, this.toClientSnapshot(userId));
		const player = this.toClientPlayers().find((p) => p.userId === userId);
		if (player) this.broadcast({ type: "player_joined", player }, server);
		console.log({ event: "player_joined", code: this.meta.code, userId });

		return new Response(null, { status: 101, webSocket: client });
	}

	override async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	) {
		// Normally answered by the auto-response without waking the object.
		if (message === "ping") return ws.send("pong");
		const size =
			typeof message === "string"
				? new TextEncoder().encode(message).byteLength
				: message.byteLength;
		if (size > MAX_MESSAGE_BYTES) {
			return this.error(ws, ERROR_CODES.messageTooLarge, "Message too large");
		}
		const msg =
			typeof message === "string" ? parseClientMessage(message) : null;
		if (!msg) {
			return this.error(ws, ERROR_CODES.invalidMessage, "Invalid message");
		}
		if (!this.take(ws)) {
			return this.error(ws, ERROR_CODES.rateLimited, "Slow down");
		}
		if (!this.cached) {
			return this.error(ws, ERROR_CODES.notFound, "Room no longer exists");
		}

		const me = ws.deserializeAttachment() as Attachment;
		switch (msg.type) {
			case "resync":
				return this.send(ws, this.toClientSnapshot(me.userId));
			case "select": {
				if (this.meta.mode !== "coop") return;
				ws.serializeAttachment({ ...me, selected: msg.cell });
				this.broadcast(
					{ type: "presence", userId: me.userId, cell: msg.cell },
					ws,
				);
				return;
			}
			default:
				if (this.meta.mode === "coop") await coopMessage(this, ws, me, msg);
				else await raceMessage(this, ws, me, msg);
		}
	}

	override async webSocketClose(ws: WebSocket, code: number, reason: string) {
		this.disconnect(ws);
		// Complete the close handshake (safe even when the runtime auto-replies).
		try {
			ws.close(code === 1005 ? 1000 : code, reason);
		} catch {
			// Already closed.
		}
	}

	override async webSocketError(ws: WebSocket) {
		this.disconnect(ws);
	}

	private disconnect(ws: WebSocket) {
		if (!this.cached) return;
		const me = ws.deserializeAttachment() as Attachment | null;
		if (!me) return;
		// A newer tab for the same user keeps them connected.
		if (this.sockets(me.userId).some((w) => w !== ws)) return;
		updatePlayer(this.sql, me.userId, { connected: false });
		this.setMeta({ lastActivityAt: this.now() });
		this.broadcast({ type: "player_left", userId: me.userId }, ws);
		console.log({
			event: "player_left",
			code: this.meta.code,
			userId: me.userId,
		});
	}

	/** Per-connection token bucket: burst 20, refill 10/s. */
	private take(ws: WebSocket): boolean {
		const now = this.now();
		const b = this.buckets.get(ws) ?? { tokens: RATE_BURST, at: now };
		b.tokens = Math.min(
			RATE_BURST,
			b.tokens + ((now - b.at) / 1000) * RATE_REFILL_PER_SEC,
		);
		b.at = now;
		const ok = b.tokens >= 1;
		if (ok) b.tokens -= 1;
		this.buckets.set(ws, b);
		return ok;
	}

	// -------------------------------------------------------------------------
	// Alarm: cleanup, and the race time limit
	// -------------------------------------------------------------------------

	override async alarm(): Promise<void> {
		if (!this.cached) {
			await this.ctx.storage.deleteAll();
			return;
		}
		const now = this.now();
		const { meta } = this;

		const raceDeadline =
			meta.mode === "race" &&
			meta.status === "playing" &&
			meta.startsAt !== null
				? meta.startsAt + RACE_MAX_DURATION_MS
				: null;
		if (raceDeadline !== null && now >= raceDeadline) {
			await this.finish();
		}

		const idleSince = this.meta.lastActivityAt;
		if (
			this.ctx.getWebSockets().length === 0 &&
			now - idleSince >= ROOM_IDLE_TTL_MS
		) {
			if (this.meta.status === "playing") {
				await this.abandon();
			}
			console.log({ event: "room_deleted", code: this.meta.code });
			await this.ctx.storage.deleteAlarm();
			await this.ctx.storage.deleteAll();
			this.cached = null;
			return;
		}

		let next = idleSince + ROOM_IDLE_TTL_MS;
		if (next <= now) next = now + ROOM_IDLE_TTL_MS;
		if (
			this.meta.status === "playing" &&
			raceDeadline !== null &&
			raceDeadline > now
		) {
			next = Math.min(next, raceDeadline);
		}
		await this.ctx.storage.setAlarm(next);
	}

	/** Records an unfinished game as abandoned before the room is deleted. */
	private async abandon() {
		const players = listPlayers(this.sql);
		if (!players.some((p) => p.placements > 0)) return;
		try {
			await recordGame(
				this.env.DB,
				{ ...this.meta, finishedAt: this.now() },
				buildResults(this.meta, players),
				"abandoned",
			);
		} catch (err) {
			console.error({
				event: "record_game_failed",
				code: this.meta.code,
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	// -------------------------------------------------------------------------
	// Snapshots: the only place room state is serialized for clients.
	// -------------------------------------------------------------------------

	private toClientPlayers(rows: PlayerRow[] = listPlayers(this.sql)): Player[] {
		const selected = new Map<string, number | null>();
		for (const ws of this.sockets()) {
			const a = ws.deserializeAttachment() as Attachment | null;
			if (a) selected.set(a.userId, a.selected);
		}
		const race = this.meta.mode === "race";
		return rows.map((p) => ({
			userId: p.userId,
			name: p.name,
			color: p.color,
			connected: p.connected,
			selected: race ? null : (selected.get(p.userId) ?? null),
			placements: p.placements,
			mistakes: p.mistakes,
			filled: p.placements,
			finished: race ? p.finishedAt !== null : this.meta.status === "finished",
		}));
	}

	/** Whitelists fields; `solution` is never included. */
	toClientSnapshot(forUserId: string): Snapshot {
		const m = this.meta;
		const rows = listPlayers(this.sql);
		const mine = rows.find((p) => p.userId === forUserId);
		const race = m.mode === "race";
		const board = race ? (mine?.board ?? m.givens) : m.board;
		return {
			type: "snapshot",
			version: race ? (mine?.placements ?? 0) : m.version,
			me: forUserId,
			hostId: m.hostId,
			mode: m.mode,
			difficulty: m.difficulty,
			status: m.status,
			givens: m.givens,
			board,
			notes: race ? emptyNotes() : m.notes,
			players: this.toClientPlayers(rows),
			mistakes: race ? (mine?.mistakes ?? 0) : m.mistakes,
			startsAt: m.startsAt,
			startedAt: m.startedAt,
			finishedAt: m.finishedAt,
			results: m.status === "finished" ? buildResults(m, rows) : null,
		};
	}
}
