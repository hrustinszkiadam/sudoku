import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { z } from "zod";
import { ERROR_CODES } from "../../shared/constants";
import { nameSchema, randomGuestName } from "../../shared/names";
import { resolveAccountUser } from "../accounts";
import { createAuth } from "../auth";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { type AppContext, type AppEnv, apiError, parseBody } from "../http";
import {
	readSession,
	requireSession,
	SESSION_COOKIE,
	writeSession,
} from "../middleware/session";

const patchSchema = z.object({ name: nameSchema });

export interface AccountInfo {
	email: string;
	image: string | null;
}

/** The signed-in Better Auth user, if any. Skips the lookup without an auth cookie. */
async function authUser(c: AppContext) {
	if (!c.req.header("cookie")?.includes("better-auth.session_token"))
		return null;
	const auth = createAuth(c.env, new URL(c.req.url).origin);
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	return session?.user ?? null;
}

export const sessionRoutes = new Hono<AppEnv>()
	.get("/", async (c) => {
		const guest = await readSession(c);

		const signedIn = await authUser(c);
		if (signedIn) {
			const session = await resolveAccountUser(
				getDb(c.env.DB),
				guest,
				signedIn,
			);
			if (session.userId !== guest?.userId || session.name !== guest.name) {
				await writeSession(c, session);
			}
			const account: AccountInfo = {
				email: signedIn.email,
				image: signedIn.image ?? null,
			};
			return c.json({ ...session, account });
		}
		if (guest) return c.json({ ...guest, account: null });

		// Cloudflare always sets a public client IP in production. A missing or
		// loopback address only happens in local dev and e2e runs, where one shared
		// key would throttle every test browser.
		const ip = c.req.header("cf-connecting-ip");
		const local = !ip || ip === "127.0.0.1" || ip === "::1";
		const limited =
			!local &&
			!(await c.env.SESSION_CREATE_LIMITER.limit({ key: ip })).success;
		if (limited) {
			return apiError(
				c,
				429,
				ERROR_CODES.rateLimited,
				"Too many new sessions, try again shortly",
			);
		}

		const session = { userId: crypto.randomUUID(), name: randomGuestName() };
		await getDb(c.env.DB).insert(users).values({
			id: session.userId,
			kind: "guest",
			name: session.name,
			createdAt: Date.now(),
		});
		await writeSession(c, session);
		console.log({ event: "session_created", userId: session.userId });
		return c.json({ ...session, account: null });
	})
	.patch("/", requireSession, async (c) => {
		const { name } = await parseBody(c, patchSchema);
		const userId = c.get("userId");
		await getDb(c.env.DB)
			.update(users)
			.set({ name })
			.where(eq(users.id, userId));
		await writeSession(c, { userId, name });
		return c.json({ userId, name });
	})
	/** Forget the game identity on this device (used when signing out). */
	.delete("/", (c) => {
		deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true });
		return c.json({ ok: true });
	});
