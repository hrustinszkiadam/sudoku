import { Hono } from "hono";
import { z } from "zod";
import { DIFFICULTIES, ERROR_CODES, MODES } from "../../shared/constants";
import { getDb } from "../db/client";
import { leaderboard } from "../db/queries";
import { type AppEnv, apiError } from "../http";
import { requireSession } from "../middleware/session";

const querySchema = z.object({
	difficulty: z.enum(DIFFICULTIES).default("easy"),
	mode: z.enum(MODES).default("coop"),
});

const CACHE_SECONDS = 30;

/** Top results, cached briefly with the Cache API (shared across users). */
export const leaderboardRoutes = new Hono<AppEnv>().get(
	"/",
	requireSession,
	async (c) => {
		const parsed = querySchema.safeParse({
			difficulty: c.req.query("difficulty") || undefined,
			mode: c.req.query("mode") || undefined,
		});
		if (!parsed.success) {
			return apiError(
				c,
				400,
				ERROR_CODES.badRequest,
				"Unknown difficulty or mode",
			);
		}
		const { difficulty, mode } = parsed.data;

		// Cookie-free cache key so every user shares one entry.
		const origin = new URL(c.req.url).origin;
		const key = new Request(
			`${origin}/api/leaderboard?difficulty=${difficulty}&mode=${mode}`,
		);
		const cache = await caches.open("leaderboard");
		const hit = await cache.match(key);
		if (hit) return new Response(hit.body, hit);

		const rows = await leaderboard(getDb(c.env.DB), difficulty, mode);
		const res = Response.json(
			{ difficulty, mode, rows },
			{ headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } },
		);
		c.executionCtx.waitUntil(cache.put(key, res.clone()));
		return res;
	},
);
