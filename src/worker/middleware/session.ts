import type { Context, MiddlewareHandler } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { ERROR_CODES } from "../../shared/constants";
import { isValidName } from "../../shared/names";
import { type AppEnv, apiError, type SessionVars } from "../http";

export const SESSION_COOKIE = "sid";
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Cookie payload: `<userId>|<uri-encoded name>`, signed with SESSION_SECRET. */
const encode = (s: SessionVars) => `${s.userId}|${encodeURIComponent(s.name)}`;

function decode(value: string): SessionVars | null {
	const sep = value.indexOf("|");
	if (sep < 0) return null;
	const userId = value.slice(0, sep);
	let name: string;
	try {
		name = decodeURIComponent(value.slice(sep + 1));
	} catch {
		return null;
	}
	if (!UUID.test(userId) || !isValidName(name)) return null;
	return { userId, name };
}

export async function readSession(
	c: Context<AppEnv>,
): Promise<SessionVars | null> {
	const value = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE);
	return typeof value === "string" ? decode(value) : null;
}

export async function writeSession(
	c: Context<AppEnv>,
	session: SessionVars,
): Promise<void> {
	await setSignedCookie(
		c,
		SESSION_COOKIE,
		encode(session),
		c.env.SESSION_SECRET,
		{
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			path: "/",
			maxAge: ONE_YEAR_S,
		},
	);
}

/** Verifies the session cookie and exposes `userId` / `name`, or responds 401. */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
	const session = await readSession(c);
	if (!session) {
		return apiError(c, 401, ERROR_CODES.unauthorized, "No valid session");
	}
	c.set("userId", session.userId);
	c.set("name", session.name);
	await next();
};
