import { Hono } from "hono";

export { GameRoom } from "./room/GameRoom";

export const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Env>;
