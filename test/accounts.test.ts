import { env } from "cloudflare:workers";
import { serializeSigned } from "hono/utils/cookie";
import { describe, expect, it } from "vitest";
import { resolveAccountUser } from "../src/worker/accounts";
import { getDb } from "../src/worker/db/client";
import { api, BASE, cookiePair, type Guest, newGuest } from "./helpers";

const SECRET = "test-better-auth-secret-0123456789abcdef";
// HTTPS base URL, so Better Auth uses the __Secure- cookie prefix.
const AUTH_COOKIE = "__Secure-better-auth.session_token";

/** Creates a Better Auth user + session in D1 and returns a signed session cookie. */
async function signIn(
	name = "Ada Lovelace",
	email = `${crypto.randomUUID()}@example.com`,
) {
	const userId = crypto.randomUUID();
	const token = crypto.randomUUID().replaceAll("-", "");
	const now = Date.now();
	await env.DB.batch([
		env.DB.prepare(
			"INSERT INTO auth_user (id, name, email, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, 1, NULL, ?, ?)",
		).bind(userId, name, email, now, now),
		env.DB.prepare(
			"INSERT INTO auth_session (id, expires_at, token, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(crypto.randomUUID(), now + 86_400_000, token, now, now, userId),
	]);
	const cookie = cookiePair(
		await serializeSigned(AUTH_COOKIE, token, SECRET, { secure: true }),
	);
	return { authUserId: userId, email, cookie };
}

const withCookies = (guest: Guest | null, authCookie: string): Guest => ({
	userId: guest?.userId ?? "",
	name: guest?.name ?? "",
	cookie: [guest?.cookie, authCookie].filter(Boolean).join("; "),
});

const userRow = (id: string) =>
	env.DB.prepare("SELECT kind, name, auth_user_id FROM users WHERE id = ?")
		.bind(id)
		.first<{ kind: string; name: string; auth_user_id: string | null }>();

describe("Better Auth setup", () => {
	it("advertises configured providers", async () => {
		const res = await api("/api/config", null);
		expect(await res.json()).toMatchObject({
			authProviders: ["github", "google"],
		});
	});

	it("starts GitHub sign-in with the right callback", async () => {
		const res = await api("/api/auth/sign-in/social", null, {
			method: "POST",
			headers: { origin: BASE },
			body: JSON.stringify({ provider: "github", callbackURL: "/" }),
		});
		expect(res.status).toBe(200);
		const { url } = await res.json<{ url: string }>();
		const authorize = new URL(url);
		expect(authorize.origin).toBe("https://github.com");
		expect(authorize.searchParams.get("client_id")).toBe("test-github-id");
		expect(authorize.searchParams.get("redirect_uri")).toBe(
			`${BASE}/api/auth/callback/github`,
		);
	});
});

describe("linking guests to accounts", () => {
	it("first sign-in turns the current guest into the account, keeping its history", async () => {
		const guest = await newGuest();
		await env.DB.batch([
			env.DB.prepare(
				"INSERT INTO games (id, room_code, puzzle_id, mode, difficulty, started_at, finished_at, status, mistakes) VALUES ('g-history', 'HIST22', 't-easy', 'coop', 'easy', 0, 1, 'won', 0)",
			),
			env.DB.prepare(
				"INSERT INTO game_players (game_id, user_id, name, placements, mistakes, finish_ms, score_ms) VALUES ('g-history', ?, ?, 3, 0, 1, 1)",
			).bind(guest.userId, guest.name),
		]);
		const { authUserId, email, cookie } = await signIn();

		const res = await api("/api/session", withCookies(guest, cookie));
		expect(await res.json()).toEqual({
			userId: guest.userId,
			name: guest.name,
			account: { email, image: null },
		});
		expect(await userRow(guest.userId)).toEqual({
			kind: "account",
			name: guest.name,
			auth_user_id: authUserId,
		});
		const history = await (await api("/api/me/history", guest)).json<{
			games: { gameId: string }[];
		}>();
		expect(history.games.map((g) => g.gameId)).toEqual(["g-history"]);
	});

	it("signing in on another device switches to the linked game user", async () => {
		const first = await newGuest();
		const { cookie } = await signIn();
		await api("/api/session", withCookies(first, cookie));

		const other = await newGuest();
		const res = await api("/api/session", withCookies(other, cookie));
		const body = await res.json<{ userId: string; name: string }>();
		expect(body.userId).toBe(first.userId);
		// The game session cookie now points at the account's game user.
		const sid = cookiePair(res.headers.get("set-cookie"));
		const again = await api("/api/session", { ...other, cookie: sid });
		expect((await again.json<{ userId: string }>()).userId).toBe(first.userId);
		// The other device's guest stays a guest.
		expect((await userRow(other.userId))?.kind).toBe("guest");
	});

	it("creates a linked game user named after the account when there is no guest", async () => {
		const { authUserId, cookie } = await signIn("Grace Hopper");
		const res = await api("/api/session", withCookies(null, cookie));
		const body = await res.json<{ userId: string; name: string }>();
		expect(body.name).toBe("Grace Hopper");
		expect(await userRow(body.userId)).toMatchObject({
			kind: "account",
			auth_user_id: authUserId,
		});
	});

	it("never takes over a guest already linked to another account", async () => {
		const db = getDb(env.DB);
		const guest = await newGuest();
		const a = await signIn();
		const b = await signIn("Bob");
		await resolveAccountUser(db, guest, {
			id: a.authUserId,
			name: "A",
			email: a.email,
		});
		const forB = await resolveAccountUser(db, guest, {
			id: b.authUserId,
			name: "Bob",
			email: b.email,
		});
		expect(forB.userId).not.toBe(guest.userId);
		expect((await userRow(guest.userId))?.auth_user_id).toBe(a.authUserId);
	});

	it("DELETE /api/session forgets the game identity on this device", async () => {
		const guest = await newGuest();
		const res = await api("/api/session", guest, { method: "DELETE" });
		expect(res.headers.get("set-cookie")).toMatch(/^sid=;/);
	});
});
