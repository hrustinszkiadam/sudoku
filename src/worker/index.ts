import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ERROR_CODES } from "../shared/constants";
import { createAuth, enabledProviders } from "./auth";
import { getDb } from "./db/client";
import { ensureDailyPuzzle, utcDate } from "./db/queries";
import { type AppEnv, apiError } from "./http";
import { dailyRoutes } from "./routes/daily";
import { leaderboardRoutes } from "./routes/leaderboard";
import { meRoutes } from "./routes/me";
import { roomRoutes } from "./routes/rooms";
import { sessionRoutes } from "./routes/session";

export { GameRoom } from "./room/GameRoom";

export const app = new Hono<AppEnv>()
	.basePath("/api")
	.get("/health", (c) => c.json({ ok: true }))
	.get("/config", (c) =>
		c.json({
			turnstileSiteKey: c.env.TURNSTILE_SITE_KEY,
			authProviders: enabledProviders(c.env),
		}),
	)
	.all("/auth/*", (c) =>
		createAuth(c.env, new URL(c.req.url).origin).handler(c.req.raw),
	)
	.route("/session", sessionRoutes)
	.route("/rooms", roomRoutes)
	.route("/daily", dailyRoutes)
	.route("/leaderboard", leaderboardRoutes)
	.route("/me", meRoutes);

app.notFound((c) => apiError(c, 404, ERROR_CODES.notFound, "Not found"));

app.onError((err, c) => {
	if (err instanceof HTTPException) return err.getResponse();
	console.error({ event: "unhandled_error", message: err.message });
	return apiError(c, 500, ERROR_CODES.internal, "Internal error");
});

/** Cron (00:05 UTC): make sure today's and tomorrow's daily puzzles exist. */
export async function scheduled(
	controller: ScheduledController,
	env: Env,
): Promise<void> {
	const db = getDb(env.DB);
	const today = utcDate(controller.scheduledTime);
	const tomorrow = utcDate(controller.scheduledTime + 86_400_000);
	for (const date of [today, tomorrow]) {
		const puzzleId = await ensureDailyPuzzle(db, date);
		console.log({ event: "daily_puzzle", date, puzzleId });
	}
}

export default {
	fetch: app.fetch,
	scheduled,
} satisfies ExportedHandler<Env>;
