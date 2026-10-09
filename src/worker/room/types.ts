import type { ErrorCode } from "../../shared/constants";
import type { ClientMessage, ServerMessage } from "../../shared/protocol";
import type { Meta } from "./storage";

/** Per-socket identity, kept with the socket so it survives hibernation. */
export interface Attachment {
	userId: string;
	name: string;
	/** Selected cell, for co-op presence. Not persisted. */
	selected: number | null;
}

/** What the mode rule modules (coop.ts, race.ts) may do to the room. */
export interface Room {
	readonly sql: SqlStorage;
	readonly meta: Meta;
	now(): number;
	/** Persists first, then updates the in-memory cache. One row write. */
	setMeta(patch: Partial<Meta>): void;
	send(ws: WebSocket, msg: ServerMessage): void;
	sendToUser(userId: string, msg: ServerMessage): void;
	broadcast(msg: ServerMessage, except?: WebSocket): void;
	error(ws: WebSocket, code: ErrorCode, message: string): void;
	/** Marks the game finished, records it in D1 and broadcasts game_over. */
	finish(): Promise<void>;
	/** Open sockets, optionally for one user. */
	sockets(userId?: string): WebSocket[];
}

export type ModeHandler = (
	room: Room,
	ws: WebSocket,
	me: Attachment,
	msg: ClientMessage,
) => void | Promise<void>;
