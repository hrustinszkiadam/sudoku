import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { api, cookiePair, newGuest } from "./helpers";

const userRow = (id: string) =>
	env.DB.prepare("SELECT kind, name FROM users WHERE id = ?")
		.bind(id)
		.first<{ kind: string; name: string }>();

describe("GET /api/session", () => {
	it("creates a guest with a signed, HttpOnly, Secure, SameSite=Lax cookie", async () => {
		const res = await api("/api/session", null);
		expect(res.status).toBe(200);
		const body = await res.json<{ userId: string; name: string }>();
		expect(body.userId).toMatch(/^[0-9a-f-]{36}$/);
		expect(body.name).toMatch(/^[A-Z][a-z]+-\d{4}$/);

		const cookie = res.headers.get("set-cookie") ?? "";
		expect(cookie).toMatch(/^sid=/);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		expect(cookie).toContain("SameSite=Lax");

		expect(await userRow(body.userId)).toEqual({
			kind: "guest",
			name: body.name,
		});
	});

	it("returns the existing session without creating a new user", async () => {
		const guest = await newGuest();
		const res = await api("/api/session", guest);
		expect(await res.json()).toEqual({
			userId: guest.userId,
			name: guest.name,
			account: null,
		});
		expect(res.headers.get("set-cookie")).toBeNull();
	});

	it("ignores a tampered cookie", async () => {
		const guest = await newGuest();
		const forged = guest.cookie.replace(guest.userId, crypto.randomUUID());
		const res = await api("/api/session", { ...guest, cookie: forged });
		const body = await res.json<{ userId: string }>();
		expect(body.userId).not.toBe(guest.userId);
	});
});

describe("PATCH /api/session", () => {
	it("renames the user and reissues the cookie", async () => {
		const guest = await newGuest();
		const res = await api("/api/session", guest, {
			method: "PATCH",
			body: JSON.stringify({ name: "  Ada  Lovelace " }),
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			userId: guest.userId,
			name: "Ada Lovelace",
		});
		expect((await userRow(guest.userId))?.name).toBe("Ada Lovelace");

		const cookie = cookiePair(res.headers.get("set-cookie"));
		const again = await api("/api/session", { ...guest, cookie });
		expect(await again.json()).toMatchObject({ name: "Ada Lovelace" });
	});

	it("rejects invalid names with a stable error code", async () => {
		const guest = await newGuest();
		for (const name of ["", "x".repeat(21), "bad\u0007", "admin"]) {
			const res = await api("/api/session", guest, {
				method: "PATCH",
				body: JSON.stringify({ name }),
			});
			expect(res.status).toBe(400);
			expect(await res.json()).toMatchObject({
				error: { code: "bad_request" },
			});
		}
	});

	it("requires a session", async () => {
		const res = await api("/api/session", null, {
			method: "PATCH",
			body: JSON.stringify({ name: "Ada" }),
		});
		expect(res.status).toBe(401);
		expect(await res.json()).toMatchObject({
			error: { code: "unauthorized" },
		});
	});
});
