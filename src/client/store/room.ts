import { createStore } from "zustand/vanilla";
import { digitAt, EMPTY, setCell } from "../../shared/sudoku/grid";
import {
	emptyNotes,
	type Notes,
	removeNoteFromPeers,
	toggleNote,
} from "../../shared/sudoku/notes";
import type {
	ClientMessage,
	ConnectionStatus,
	Player,
	ServerMessage,
	Snapshot,
} from "../types";

export const MISTAKE_FLASH_MS = 600;
export const PRESENCE_THROTTLE_MS = 100;

type GameState = Omit<Snapshot, "type">;

export interface RoomState extends GameState {
	loaded: boolean;
	conn: ConnectionStatus;
	/** Optimistic placements awaiting `applied` / `mistake`. */
	pending: Map<number, number>;
	flashing: Set<number>;
	selected: number | null;
	notesMode: boolean;
	lastError: string | null;
}

export interface RoomActions {
	handle: (msg: ServerMessage) => void;
	setConn: (conn: ConnectionStatus) => void;
	select: (cell: number | null) => void;
	place: (digit: number) => void;
	toggleNote: (digit: number) => void;
	clearNotes: () => void;
	toggleNotesMode: () => void;
	start: () => void;
	end: () => void;
	dismissError: () => void;
}

export type RoomStore = ReturnType<typeof createRoomStore>;

/** Race notes are client-only, kept in localStorage per room. */
export interface NotesStorage {
	load(): Notes | null;
	save(notes: Notes): void;
}

const initial = (): GameState & Omit<RoomState, keyof GameState> => ({
	loaded: false,
	conn: "connecting",
	version: 0,
	me: "",
	hostId: "",
	mode: "coop",
	difficulty: "easy",
	status: "playing",
	givens: EMPTY.repeat(81),
	board: EMPTY.repeat(81),
	notes: emptyNotes(),
	players: [],
	mistakes: 0,
	startsAt: null,
	startedAt: null,
	finishedAt: null,
	results: null,
	pending: new Map(),
	flashing: new Set(),
	selected: null,
	notesMode: false,
	lastError: null,
});

const updatePlayer = (
	players: Player[],
	userId: string,
	patch: (p: Player) => Partial<Player>,
): Player[] =>
	players.map((p) => (p.userId === userId ? { ...p, ...patch(p) } : p));

/**
 * One store per room session. `send` goes to the room socket; `raceNotes`
 * persists race-mode notes locally.
 */
export function createRoomStore(
	send: (msg: ClientMessage) => void,
	raceNotes?: NotesStorage,
) {
	return createStore<RoomState & RoomActions>()((set, get) => {
		const flash = (cell: number) => {
			set((s) => ({ flashing: new Set(s.flashing).add(cell) }));
			setTimeout(() => {
				set((s) => {
					const flashing = new Set(s.flashing);
					flashing.delete(cell);
					return { flashing };
				});
			}, MISTAKE_FLASH_MS);
		};

		/** Applies a versioned update, or asks for a fresh snapshot on a gap. */
		const inOrder = (version: number): boolean => {
			if (version === get().version + 1) return true;
			if (version > get().version) send({ type: "resync" });
			return false;
		};

		const withoutPending = (cell: number) => {
			const pending = new Map(get().pending);
			pending.delete(cell);
			return pending;
		};

		// Presence is throttled (trailing) so fast arrow-key movement
		// stays well under the server's per-connection rate limit.
		let lastPresence = 0;
		let presenceTimer: ReturnType<typeof setTimeout> | null = null;
		const sendPresence = () => {
			if (presenceTimer) return;
			const wait = Math.max(
				0,
				lastPresence + PRESENCE_THROTTLE_MS - Date.now(),
			);
			presenceTimer = setTimeout(() => {
				presenceTimer = null;
				lastPresence = Date.now();
				send({ type: "select", cell: get().selected });
			}, wait);
		};

		const setNotes = (notes: Notes) => {
			if (get().mode === "race") raceNotes?.save(notes);
			set({ notes });
		};

		return {
			...initial(),

			handle(msg) {
				const s = get();
				switch (msg.type) {
					case "snapshot": {
						const { type: _, ...snap } = msg;
						const notes =
							snap.mode === "race"
								? (raceNotes?.load() ?? snap.notes)
								: snap.notes;
						set({ ...snap, notes, loaded: true, pending: new Map() });
						return;
					}
					case "applied": {
						if (!inOrder(msg.version)) return;
						const notes = removeNoteFromPeers(s.notes, msg.cell, msg.digit);
						notes[msg.cell] = 0;
						if (s.mode === "race") raceNotes?.save(notes);
						set({
							version: msg.version,
							board: setCell(s.board, msg.cell, msg.digit),
							notes,
							pending: withoutPending(msg.cell),
							players: updatePlayer(s.players, msg.by, (p) => ({
								placements: p.placements + 1,
								filled: p.filled + 1,
							})),
						});
						return;
					}
					case "mistake": {
						if (msg.by === s.me) flash(msg.cell);
						set({
							mistakes: s.mistakes + 1,
							pending: withoutPending(msg.cell),
							players: updatePlayer(s.players, msg.by, (p) => ({
								mistakes: p.mistakes + 1,
							})),
						});
						return;
					}
					case "notes": {
						if (!inOrder(msg.version)) return;
						const notes = s.notes.slice();
						notes[msg.cell] = msg.mask;
						set({ version: msg.version, notes });
						return;
					}
					case "presence":
						set({
							players: updatePlayer(s.players, msg.userId, () => ({
								selected: msg.cell,
							})),
						});
						return;
					case "player_joined": {
						const others = s.players.filter(
							(p) => p.userId !== msg.player.userId,
						);
						set({ players: [...others, msg.player] });
						return;
					}
					case "player_left":
						set({
							players: updatePlayer(s.players, msg.userId, () => ({
								connected: false,
								selected: null,
							})),
						});
						return;
					case "progress":
						set({
							players: updatePlayer(s.players, msg.userId, () => ({
								filled: msg.filled,
								placements: msg.filled,
								mistakes: msg.mistakes,
							})),
						});
						return;
					case "status":
						set({
							status: msg.status,
							startsAt: msg.startsAt ?? s.startsAt,
						});
						return;
					case "player_finished":
						set({
							players: updatePlayer(s.players, msg.userId, () => ({
								finished: true,
							})),
						});
						return;
					case "game_over":
						set({
							status: "finished",
							results: msg.results,
							finishedAt: s.finishedAt ?? Date.now(),
							pending: new Map(),
						});
						return;
					case "error":
						set({ lastError: msg.message, pending: new Map() });
						return;
				}
			},

			setConn: (conn) => set({ conn }),

			select(cell) {
				if (cell === get().selected) return;
				set({ selected: cell });
				if (get().mode === "coop") sendPresence();
			},

			place(digit) {
				const s = get();
				const cell = s.selected;
				if (cell === null || s.status !== "playing") return;
				if (digitAt(s.board, cell) !== 0 || s.pending.has(cell)) return;
				if (
					s.mode === "race" &&
					s.startsAt !== null &&
					Date.now() < s.startsAt
				) {
					return;
				}
				set({ pending: new Map(s.pending).set(cell, digit) });
				send({ type: "place", cell, digit });
			},

			toggleNote(digit) {
				const s = get();
				const cell = s.selected;
				if (cell === null || s.status !== "playing") return;
				if (digitAt(s.board, cell) !== 0) return;
				if (s.mode === "race") {
					const notes = s.notes.slice();
					notes[cell] = toggleNote(notes[cell], digit);
					setNotes(notes);
					return;
				}
				send({ type: "note", cell, digit });
			},

			clearNotes() {
				const s = get();
				const cell = s.selected;
				if (cell === null || s.status !== "playing" || !s.notes[cell]) return;
				if (s.mode === "race") {
					const notes = s.notes.slice();
					notes[cell] = 0;
					setNotes(notes);
					return;
				}
				send({ type: "clear_notes", cell });
			},

			toggleNotesMode: () => set((s) => ({ notesMode: !s.notesMode })),
			start: () => send({ type: "start" }),
			end: () => send({ type: "end" }),
			dismissError: () => set({ lastError: null }),
		};
	});
}
