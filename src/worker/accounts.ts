import { and, eq, isNull } from "drizzle-orm";
import { NAME_MAX_LENGTH } from "../shared/constants";
import { nameSchema, randomGuestName } from "../shared/names";
import type { Db } from "./db/client";
import { users } from "./db/schema";
import type { SessionVars } from "./http";

export interface AuthUserInfo {
	id: string;
	name: string;
	email: string;
	image?: string | null;
}

/**
 * Maps a signed-in auth user to a game identity (`users` row):
 * - already linked: use that game user (e.g. signing in on a new device);
 * - first sign-in: link the current guest, so its history comes along;
 * - otherwise: create a new linked game user.
 */
export async function resolveAccountUser(
	db: Db,
	guest: SessionVars | null,
	authUser: AuthUserInfo,
): Promise<SessionVars> {
	const linked = await findLinked(db, authUser.id);
	if (linked) return linked;

	if (guest) {
		const [row] = await db
			.update(users)
			.set({ kind: "account", authUserId: authUser.id })
			.where(and(eq(users.id, guest.userId), isNull(users.authUserId)))
			.returning({ id: users.id, name: users.name });
		if (row) {
			console.log({ event: "account_linked", userId: row.id });
			return { userId: row.id, name: row.name };
		}
	}

	const fromProvider = nameSchema.safeParse(
		[...authUser.name].slice(0, NAME_MAX_LENGTH).join(""),
	);
	const session = {
		userId: crypto.randomUUID(),
		name: fromProvider.success ? fromProvider.data : randomGuestName(),
	};
	try {
		await db.insert(users).values({
			id: session.userId,
			kind: "account",
			name: session.name,
			createdAt: Date.now(),
			authUserId: authUser.id,
		});
	} catch (err) {
		// A concurrent request linked it first (unique auth_user_id).
		const raced = await findLinked(db, authUser.id);
		if (raced) return raced;
		throw err;
	}
	console.log({ event: "account_created", userId: session.userId });
	return session;
}

async function findLinked(
	db: Db,
	authUserId: string,
): Promise<SessionVars | null> {
	const [row] = await db
		.select({ userId: users.id, name: users.name })
		.from(users)
		.where(eq(users.authUserId, authUserId))
		.limit(1);
	return row ?? null;
}
