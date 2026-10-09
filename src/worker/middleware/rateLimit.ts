import type { MiddlewareHandler } from "hono";
import { ERROR_CODES } from "../../shared/constants";
import { type AppContext, type AppEnv, apiError } from "../http";

/** Rejects with 429 when the Rate Limiting binding says the key is over its limit. */
export const rateLimit =
	(
		pick: (env: Env) => RateLimit,
		key: (c: AppContext) => string,
	): MiddlewareHandler<AppEnv> =>
	async (c, next) => {
		const { success } = await pick(c.env).limit({ key: key(c) });
		if (!success) {
			return apiError(
				c,
				429,
				ERROR_CODES.rateLimited,
				"Too many requests, try again shortly",
			);
		}
		await next();
	};
