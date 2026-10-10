import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { CLOSE_REPLACED, PING_INTERVAL_MS } from "../../shared/constants";
import {
	type ClientMessage,
	clientMessageSchema,
	type ServerMessage,
	serverMessageSchema,
} from "../../shared/protocol";
import type { ConnectionStatus } from "../types";

export interface RoomSocket {
	send(msg: ClientMessage): void;
	close(): void;
}

export interface RoomSocketHandlers {
	onMessage: (msg: ServerMessage) => void;
	onStatus: (status: ConnectionStatus) => void;
}

const roomUrl = (code: string) => {
	const proto = location.protocol === "https:" ? "wss:" : "ws:";
	return `${proto}//${location.host}/api/rooms/${encodeURIComponent(code)}/ws`;
};

/**
 * Reconnecting room socket with exponential backoff and a 30 s "ping".
 * The server sends a fresh snapshot on every (re)connect.
 */
export function openRoomSocket(
	code: string,
	{ onMessage, onStatus }: RoomSocketHandlers,
): RoomSocket {
	const ws = new ReconnectingWebSocket(roomUrl(code), [], {
		minReconnectionDelay: 500,
		maxReconnectionDelay: 10_000,
		reconnectionDelayGrowFactor: 1.6,
		connectionTimeout: 8_000,
		maxEnqueuedMessages: 20,
	});
	let everOpened = false;
	let stopped = false;

	const ping = setInterval(() => {
		if (ws.readyState === ws.OPEN) ws.send("ping");
	}, PING_INTERVAL_MS);

	ws.addEventListener("open", () => {
		everOpened = true;
		onStatus("open");
	});
	ws.addEventListener("close", (e) => {
		if (stopped) return;
		if (e.code === CLOSE_REPLACED) {
			// Another tab took over; don't fight it.
			stopped = true;
			clearInterval(ping);
			ws.close();
			onStatus("replaced");
			return;
		}
		onStatus(everOpened ? "reconnecting" : "connecting");
	});
	ws.addEventListener("message", (e: MessageEvent) => {
		if (typeof e.data !== "string" || e.data === "pong") return;
		let json: unknown;
		try {
			json = JSON.parse(e.data);
		} catch {
			return;
		}
		if (import.meta.env.DEV) {
			const parsed = serverMessageSchema.safeParse(json);
			if (!parsed.success) {
				console.warn("Invalid server message", json, parsed.error);
				return;
			}
		}
		onMessage(json as ServerMessage);
	});

	return {
		send(msg) {
			if (import.meta.env.DEV) clientMessageSchema.parse(msg);
			ws.send(JSON.stringify(msg));
		},
		close() {
			stopped = true;
			clearInterval(ping);
			ws.close();
			onStatus("closed");
		},
	};
}
