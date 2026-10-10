import type { Difficulty, Mode, RoomStatus } from "../types";

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`/api${path}`, {
		...init,
		credentials: "same-origin",
		headers: init.body
			? { "content-type": "application/json", ...init.headers }
			: init.headers,
	});
	const body: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const err = (body as { error?: { code?: string; message?: string } } | null)
			?.error;
		throw new ApiError(
			res.status,
			err?.code ?? "unknown",
			err?.message ?? `Request failed (${res.status})`,
		);
	}
	return body as T;
}

export interface Session {
	userId: string;
	name: string;
}

export interface RoomPreview {
	exists: boolean;
	mode?: Mode;
	difficulty?: Difficulty;
	status?: RoomStatus;
	playerCount?: number;
	maxPlayers?: number;
}

export const api = {
	session: () => request<Session>("/session"),
	rename: (name: string) =>
		request<Session>("/session", {
			method: "PATCH",
			body: JSON.stringify({ name }),
		}),
	config: () => request<{ turnstileSiteKey: string }>("/config"),
	createRoom: (body: {
		mode: Mode;
		difficulty: Difficulty;
		turnstileToken: string;
	}) =>
		request<{ code: string }>("/rooms", {
			method: "POST",
			body: JSON.stringify(body),
		}),
	room: (code: string) =>
		request<RoomPreview>(`/rooms/${encodeURIComponent(code)}`),
};
