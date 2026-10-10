import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ERROR_CODES } from "../../shared/constants";
import { nameSchema, randomGuestName } from "../../shared/names";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { type AppEnv, apiError, parseBody } from "../http";
import {
	readSession,
	requireSession,
	writeSession,
} from "../middleware/session";

const patchSchema = z.object({ name: nameSchema });

export const sessionRoutes = new Hono<AppEnv>()
	.get("/", async (c) => {
		const existing = await readSession(c);
		if (existing) return c.json(existing);

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
		return c.json(session);
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
	});
