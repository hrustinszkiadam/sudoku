import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

export const AUTH_PROVIDERS = ["github", "google"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** Optional secrets: a provider is enabled only when both of its values are set. */
function credentials(env: Env, provider: AuthProvider) {
	const vars = env as unknown as Record<string, string | undefined>;
	const prefix = provider.toUpperCase();
	const clientId = vars[`${prefix}_CLIENT_ID`];
	const clientSecret = vars[`${prefix}_CLIENT_SECRET`];
	return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const enabledProviders = (env: Env): AuthProvider[] =>
	AUTH_PROVIDERS.filter((p) => credentials(env, p) !== null);

/**
 * Better Auth on D1 (Drizzle adapter) with GitHub and Google sign-in, mounted
 * at /api/auth. Created per request because bindings are per request.
 */
export function createAuth(env: Env, origin: string) {
	const github = credentials(env, "github");
	const google = credentials(env, "google");
	return betterAuth({
		baseURL: origin,
		basePath: "/api/auth",
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(drizzle(env.DB, { schema }), {
			provider: "sqlite",
			schema: {
				user: schema.authUser,
				session: schema.authSession,
				account: schema.authAccount,
				verification: schema.authVerification,
			},
		}),
		socialProviders: {
			...(github ? { github } : {}),
			...(google ? { google } : {}),
		},
		session: {
			// Avoid a D1 read on every session check.
			cookieCache: { enabled: true, maxAge: 5 * 60 },
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
