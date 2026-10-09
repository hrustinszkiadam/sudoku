import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { ERROR_CODES, type ErrorCode } from "../shared/constants";

export interface SessionVars {
	userId: string;
	name: string;
}

export type AppEnv = { Bindings: Env; Variables: SessionVars };
export type AppContext = Context<AppEnv>;

/** Every error response: `{ error: { code, message } }` with a stable code. */
export const apiError = (
	c: Context,
	status: ContentfulStatusCode,
	code: ErrorCode,
	message: string,
) => c.json({ error: { code, message } }, status);

/** Parses the JSON body with `schema`, or throws a 400. */
export async function parseBody<S extends z.ZodType>(
	c: Context,
	schema: S,
): Promise<z.output<S>> {
	let raw: unknown;
	try {
		raw = await c.req.json();
	} catch {
		raw = undefined;
	}
	const result = schema.safeParse(raw);
	if (!result.success) {
		const message = result.error.issues[0]?.message ?? "Invalid request body";
		throw new HTTPException(400, {
			res: Response.json(
				{ error: { code: ERROR_CODES.badRequest, message } },
				{ status: 400 },
			),
		});
	}
	return result.data;
}
