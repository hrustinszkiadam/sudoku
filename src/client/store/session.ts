import { create } from "zustand";
import { ApiError, api, type Session } from "../net/api";

interface SessionState {
	session: Session | null;
	error: string | null;
	load: () => Promise<void>;
	rename: (name: string) => Promise<string | null>;
}

/** Guest identity; loaded once on startup (sets the session cookie). */
export const useSession = create<SessionState>((set) => ({
	session: null,
	error: null,
	async load() {
		try {
			set({ session: await api.session(), error: null });
		} catch (err) {
			set({
				error: err instanceof Error ? err.message : "Could not start a session",
			});
		}
	},
	/** Returns an error message, or null on success. */
	async rename(name) {
		try {
			set({ session: await api.rename(name) });
			return null;
		} catch (err) {
			return err instanceof ApiError ? err.message : "Could not save the name";
		}
	},
}));
