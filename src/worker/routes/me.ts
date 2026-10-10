import { Hono } from "hono";
import { getDb } from "../db/client";
import { history } from "../db/queries";
import type { AppEnv } from "../http";
import { requireSession } from "../middleware/session";

export const meRoutes = new Hono<AppEnv>().get(
	"/history",
	requireSession,
	async (c) =>
		c.json({ games: await history(getDb(c.env.DB), c.get("userId")) }),
);
