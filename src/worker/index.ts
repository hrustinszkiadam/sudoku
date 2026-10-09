import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ERROR_CODES } from "../shared/constants";
import { type AppEnv, apiError } from "./http";
import { roomRoutes } from "./routes/rooms";
import { sessionRoutes } from "./routes/session";

export { GameRoom } from "./room/GameRoom";

export const app = new Hono<AppEnv>()
	.basePath("/api")
	.get("/health", (c) => c.json({ ok: true }))
	.get("/config", (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY }))
	.route("/session", sessionRoutes)
	.route("/rooms", roomRoutes);

app.notFound((c) => apiError(c, 404, ERROR_CODES.notFound, "Not found"));

app.onError((err, c) => {
	if (err instanceof HTTPException) return err.getResponse();
	console.error({ event: "unhandled_error", message: err.message });
	return apiError(c, 500, ERROR_CODES.internal, "Internal error");
});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Env>;
