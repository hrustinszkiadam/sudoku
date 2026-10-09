import { env, exports } from "cloudflare:workers";
import { vi } from "vitest";
import type { ServerMessage, ServerMessageOf } from "../src/shared/protocol";
import { EASY } from "../src/shared/sudoku/fixtures";

export const BASE = "https://sudoku.test";

export interface Guest {
	userId: string;
	name: string;
	cookie: string;
}

/** Extracts `name=value` from a Set-Cookie header. */
export const cookiePair = (setCookie: string | null): string =>
	(setCookie ?? "").split(";")[0];

export async function newGuest(): Promise<Guest> {
	const res = await exports.default.fetch(`${BASE}/api/session`);
	if (!res.ok) throw new Error(`session failed: ${res.status}`);
	const body = await res.json<{ userId: string; name: string }>();
	return { ...body, cookie: cookiePair(res.headers.get("set-cookie")) };
}

export const api = (
	path: string,
	guest: Guest | null,
	init: RequestInit = {},
): Promise<Response> => {
	const headers = new Headers(init.headers);
	if (guest) headers.set("cookie", guest.cookie);
	if (init.body) headers.set("content-type", "application/json");
	return exports.default.fetch(`${BASE}${path}`, { ...init, headers });
};

// ---------------------------------------------------------------------------
// Rooms and sockets
// ---------------------------------------------------------------------------

/** A solved grid with three holes, used as the "expert" puzzle in tests. */
export const NEARLY = {
	givens: `000${EASY.solution.slice(3)}`,
	solution: EASY.solution,
};

/** Seeds one known puzzle per difficulty (idempotent). */
export async function seedPuzzles(): Promise<void> {
	const rows = [
		["t-easy", EASY.givens, EASY.solution, "easy"],
		["t-medium", EASY.givens, EASY.solution, "medium"],
		["t-hard", EASY.givens, EASY.solution, "hard"],
		["t-expert", NEARLY.givens, NEARLY.solution, "expert"],
	];
	await env.DB.batch(
		rows.map((r) =>
			env.DB.prepare(
				"INSERT OR IGNORE INTO puzzles (id, givens, solution, difficulty, score, created_at) VALUES (?, ?, ?, ?, 1, 0)",
			).bind(...r),
		),
	);
}

/** Makes Turnstile siteverify succeed (or fail) without network access. */
export function mockTurnstile(success = true) {
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.includes("challenges.cloudflare.com")) {
			return Response.json({ success });
		}
		throw new Error(`Unexpected fetch in test: ${url}`);
	});
}

export async function createRoomFor(
	guest: Guest,
	body: { mode?: string; difficulty?: string } = {},
): Promise<string> {
	const res = await api("/api/rooms", guest, {
		method: "POST",
		body: JSON.stringify({
			mode: "coop",
			difficulty: "easy",
			turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
			...body,
		}),
	});
	if (res.status !== 201) {
		throw new Error(`create room failed: ${res.status} ${await res.text()}`);
	}
	return (await res.json<{ code: string }>()).code;
}

const openSockets = new Set<TestSocket>();

/** Closes every test socket and waits for the handshake, so test files can tear down. */
export async function closeAllSockets(): Promise<void> {
	await Promise.all([...openSockets].map((s) => s.close()));
}

/** A client socket that buffers server messages for assertions. */
export class TestSocket {
	readonly raw: WebSocket;
	readonly received: ServerMessage[] = [];
	private queue: ServerMessage[] = [];
	private waiters: (() => void)[] = [];
	closed: { code: number; reason: string } | null = null;

	constructor(ws: WebSocket) {
		this.raw = ws;
		openSockets.add(this);
		ws.accept();
		ws.addEventListener("message", (e) => {
			if (typeof e.data !== "string" || e.data === "pong") return;
			const msg = JSON.parse(e.data) as ServerMessage;
			this.received.push(msg);
			this.queue.push(msg);
			for (const w of this.waiters.splice(0)) w();
		});
		ws.addEventListener("close", (e) => {
			this.closed = { code: e.code, reason: e.reason };
			openSockets.delete(this);
			for (const w of this.waiters.splice(0)) w();
		});
	}

	send(msg: unknown): void {
		this.raw.send(typeof msg === "string" ? msg : JSON.stringify(msg));
	}

	/** Resolves with (and consumes) the next message of `type`. */
	async next<T extends ServerMessage["type"]>(
		type: T,
		timeoutMs = 2000,
	): Promise<ServerMessageOf<T>> {
		const deadline = Date.now() + timeoutMs;
		while (true) {
			const i = this.queue.findIndex((m) => m.type === type);
			if (i >= 0) return this.queue.splice(i, 1)[0] as ServerMessageOf<T>;
			const left = deadline - Date.now();
			if (left <= 0) {
				throw new Error(
					`Timed out waiting for ${type}; got ${JSON.stringify(this.queue.map((m) => m.type))}`,
				);
			}
			await new Promise<void>((resolve) => {
				const t = setTimeout(resolve, left);
				this.waiters.push(() => {
					clearTimeout(t);
					resolve();
				});
			});
		}
	}

	/** Waits briefly and asserts no message of `type` arrived. */
	async none(type: ServerMessage["type"], ms = 100): Promise<boolean> {
		await new Promise((r) => setTimeout(r, ms));
		return !this.queue.some((m) => m.type === type);
	}

	waitClosed(timeoutMs = 2000): Promise<{ code: number; reason: string }> {
		return new Promise((resolve, reject) => {
			const start = Date.now();
			const check = () => {
				if (this.closed) return resolve(this.closed);
				if (Date.now() - start > timeoutMs)
					return reject(new Error("not closed"));
				setTimeout(check, 10);
			};
			check();
		});
	}

	/** Closes and waits for the server's close frame. */
	async close(): Promise<void> {
		if (this.closed) return;
		try {
			this.raw.close(1000, "done");
		} catch {
			// Already closing.
		}
		await this.waitClosed().catch(() => undefined);
		openSockets.delete(this);
	}
}

export async function connect(
	code: string,
	guest: Guest | null,
	extraHeaders: Record<string, string> = {},
): Promise<TestSocket> {
	const res = await api(`/api/rooms/${code}/ws`, guest, {
		headers: { Upgrade: "websocket", ...extraHeaders },
	});
	if (!res.webSocket) {
		throw new Error(`upgrade failed: ${res.status} ${await res.text()}`);
	}
	return new TestSocket(res.webSocket);
}
