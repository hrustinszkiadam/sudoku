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

export type AuthProvider = "github" | "google";

export interface Session {
	userId: string;
	name: string;
	/** Present when signed in with GitHub or Google. */
	account?: { email: string; image: string | null } | null;
}

export interface RoomPreview {
	exists: boolean;
	mode?: Mode;
	difficulty?: Difficulty;
	status?: RoomStatus;
	playerCount?: number;
	maxPlayers?: number;
}

export interface LeaderboardRow {
	userId: string;
	name: string;
	bestMs: number;
	games: number;
}

export interface Daily {
	date: string;
	difficulty: Difficulty;
	code: string;
	leaderboard: LeaderboardRow[];
}

export interface HistoryGame {
	gameId: string;
	roomCode: string;
	mode: Mode;
	difficulty: Difficulty;
	status: "won" | "abandoned";
	startedAt: number;
	finishedAt: number;
	placements: number;
	mistakes: number;
	finishMs: number | null;
	scoreMs: number | null;
	rank: number | null;
}

export const api = {
	session: () => request<Session>("/session"),
	rename: (name: string) =>
		request<Session>("/session", {
			method: "PATCH",
			body: JSON.stringify({ name }),
		}),
	config: () =>
		request<{ turnstileSiteKey: string; authProviders: AuthProvider[] }>(
			"/config",
		),
	/** Returns the provider's authorization URL to redirect to. */
	signIn: (provider: AuthProvider, callbackURL: string) =>
		request<{ url: string }>("/auth/sign-in/social", {
			method: "POST",
			body: JSON.stringify({ provider, callbackURL }),
		}),
	signOut: async () => {
		await request("/auth/sign-out", { method: "POST", body: "{}" });
		await request("/session", { method: "DELETE" });
	},
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
	daily: () => request<Daily>("/daily"),
	leaderboard: (difficulty: Difficulty, mode: Mode) =>
		request<{ rows: LeaderboardRow[] }>(
			`/leaderboard?difficulty=${difficulty}&mode=${mode}`,
		),
	history: () => request<{ games: HistoryGame[] }>("/me/history"),
};
