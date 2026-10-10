import { WebSocket as ReconnectingWebSocket } from "partysocket";
import {
	CLOSE_REPLACED,
	ERROR_CODES,
	PING_INTERVAL_MS,
} from "../../shared/constants";
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

	// Keepalive: "ping" every 30 s. If the previous ping got no "pong",
	// the connection is half-open, so force a reconnect.
	let awaitingPong = false;
	const ping = setInterval(() => {
		if (ws.readyState !== ws.OPEN) return;
		if (awaitingPong) {
			awaitingPong = false;
			ws.reconnect();
			return;
		}
		awaitingPong = true;
		ws.send("ping");
	}, PING_INTERVAL_MS);

	// The browser knows about network loss before the socket does.
	const onOffline = () => {
		if (!stopped) onStatus("reconnecting");
	};
	const onOnline = () => {
		if (!stopped) ws.reconnect();
	};
	window.addEventListener("offline", onOffline);
	window.addEventListener("online", onOnline);
	const stop = () => {
		stopped = true;
		clearInterval(ping);
		window.removeEventListener("offline", onOffline);
		window.removeEventListener("online", onOnline);
		ws.close();
	};

	/** Another tab took over; don't fight it. */
	const replaced = () => {
		stop();
		onStatus("replaced");
	};

	ws.addEventListener("open", () => {
		everOpened = true;
		onStatus("open");
	});
	ws.addEventListener("close", (e) => {
		if (stopped) return;
		if (e.code === CLOSE_REPLACED) return replaced();
		onStatus(everOpened ? "reconnecting" : "connecting");
	});
	ws.addEventListener("message", (e: MessageEvent) => {
		awaitingPong = false;
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
		const msg = json as ServerMessage;
		if (msg.type === "error" && msg.code === ERROR_CODES.replaced) {
			return replaced();
		}
		onMessage(msg);
	});

	return {
		send(msg) {
			if (import.meta.env.DEV) clientMessageSchema.parse(msg);
			ws.send(JSON.stringify(msg));
		},
		close() {
			stop();
			onStatus("closed");
		},
	};
}
