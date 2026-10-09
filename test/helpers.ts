import { exports } from "cloudflare:workers";

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
