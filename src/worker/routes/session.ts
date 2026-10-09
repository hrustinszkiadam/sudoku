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

		const ip = c.req.header("cf-connecting-ip") ?? "unknown";
		const { success } = await c.env.SESSION_CREATE_LIMITER.limit({ key: ip });
		if (!success) {
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
