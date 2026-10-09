import { Hono } from "hono";
import { z } from "zod";
import {
	DIFFICULTIES,
	ERROR_CODES,
	MODES,
	ROOM_CODE_ALPHABET,
	ROOM_CODE_LENGTH,
} from "../../shared/constants";
import { getDb } from "../db/client";
import { pickRandomPuzzle } from "../db/queries";
import { type AppEnv, apiError, parseBody } from "../http";
import { rateLimit } from "../middleware/rateLimit";
import { readSession, requireSession } from "../middleware/session";
import { verifyTurnstile } from "../middleware/turnstile";
import type { InitParams } from "../room/GameRoom";

const CODE_PATTERN = new RegExp(
	`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`,
);
const MAX_CODE_ATTEMPTS = 5;

const createSchema = z.object({
	mode: z.enum(MODES),
	difficulty: z.enum(DIFFICULTIES),
	turnstileToken: z.string().min(1).max(2048),
});

/** 6 characters from the unambiguous alphabet, without modulo bias. */
export function randomRoomCode(): string {
	const n = ROOM_CODE_ALPHABET.length;
	const limit = 256 - (256 % n);
	let code = "";
	while (code.length < ROOM_CODE_LENGTH) {
		for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
			if (byte < limit && code.length < ROOM_CODE_LENGTH) {
				code += ROOM_CODE_ALPHABET[byte % n];
			}
		}
	}
	return code;
}

export const normalizeCode = (raw: string): string | null => {
	const code = raw.toUpperCase();
	return CODE_PATTERN.test(code) ? code : null;
};

/** Creates a room, retrying on code collisions. Exported for tests. */
export async function createRoom(
	env: Env,
	params: Omit<InitParams, "code">,
	nextCode: () => string = randomRoomCode,
): Promise<string | null> {
	for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
		const code = nextCode();
		const { created } = await env.GAME_ROOM.getByName(code).init({
			...params,
			code,
		});
		if (created) return code;
	}
	return null;
}

export const roomRoutes = new Hono<AppEnv>()
	.post(
		"/",
		requireSession,
		rateLimit(
			(env) => env.ROOM_CREATE_LIMITER,
			(c) => c.get("userId"),
		),
		async (c) => {
			const body = await parseBody(c, createSchema);
			const ok = await verifyTurnstile(
				body.turnstileToken,
				c.env.TURNSTILE_SECRET_KEY,
				c.req.header("cf-connecting-ip"),
			);
			if (!ok) {
				return apiError(
					c,
					403,
					ERROR_CODES.turnstileFailed,
					"Verification failed, please retry",
				);
			}

			const puzzle = await pickRandomPuzzle(getDb(c.env.DB), body.difficulty);
			if (!puzzle) {
				return apiError(c, 503, ERROR_CODES.noPuzzles, "No puzzles available");
			}
			const code = await createRoom(c.env, {
				mode: body.mode,
				difficulty: body.difficulty,
				puzzleId: puzzle.id,
				givens: puzzle.givens,
				solution: puzzle.solution,
				hostId: c.get("userId"),
			});
			if (!code) {
				return apiError(
					c,
					503,
					ERROR_CODES.internal,
					"Could not allocate a room code",
				);
			}
			return c.json({ code }, 201);
		},
	)
	.get("/:code", requireSession, async (c) => {
		const code = normalizeCode(c.req.param("code"));
		if (!code) return c.json({ exists: false });
		return c.json(await c.env.GAME_ROOM.getByName(code).preview());
	})
	.get("/:code/ws", async (c) => {
		if (c.req.header("Upgrade") !== "websocket") {
			return apiError(
				c,
				426,
				ERROR_CODES.upgradeRequired,
				"Expected a WebSocket upgrade",
			);
		}
		const session = await readSession(c);
		if (!session) {
			return apiError(c, 401, ERROR_CODES.unauthorized, "No valid session");
		}
		const code = normalizeCode(c.req.param("code"));
		if (!code) return apiError(c, 404, ERROR_CODES.notFound, "Room not found");

		// Identity comes only from the verified session, never the client.
		const headers = new Headers(c.req.raw.headers);
		for (const key of [...headers.keys()]) {
			if (key.toLowerCase().startsWith("x-user-")) headers.delete(key);
		}
		headers.set("X-User-Id", session.userId);
		headers.set("X-User-Name", encodeURIComponent(session.name));
		const forwarded = new Request(c.req.raw.url, { method: "GET", headers });
		return c.env.GAME_ROOM.getByName(code).fetch(forwarded);
	});
