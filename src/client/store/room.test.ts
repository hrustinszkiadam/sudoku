import { afterEach, describe, expect, it, vi } from "vitest";
import { EASY } from "../../shared/sudoku/fixtures";
import { emptyNotes } from "../../shared/sudoku/notes";
import type { ClientMessage, Snapshot } from "../types";
import { createRoomStore, MISTAKE_FLASH_MS } from "./room";

const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
	type: "snapshot",
	version: 0,
	me: "me",
	hostId: "me",
	mode: "coop",
	difficulty: "easy",
	status: "playing",
	givens: EASY.givens,
	board: EASY.givens,
	notes: emptyNotes(),
	players: [
		{
			userId: "me",
			name: "Me",
			color: "#000",
			connected: true,
			selected: null,
			placements: 0,
			mistakes: 0,
			hints: 0,
			filled: 0,
			finished: false,
		},
	],
	mistakes: 0,
	hints: 0,
	startsAt: null,
	startedAt: 0,
	finishedAt: null,
	results: null,
	...over,
});

function setup(over?: Partial<Snapshot>) {
	const sent: ClientMessage[] = [];
	const store = createRoomStore((m) => sent.push(m));
	store.getState().handle(snapshot(over));
	return { store, sent };
}

afterEach(() => vi.useRealTimers());

describe("room store", () => {
	it("places optimistically and confirms on applied", () => {
		const { store, sent } = setup();
		store.getState().select(2);
		store.getState().place(4);
		expect(store.getState().pending.get(2)).toBe(4);
		expect(sent).toContainEqual({ type: "place", cell: 2, digit: 4 });

		store
			.getState()
			.handle({ type: "applied", version: 1, cell: 2, digit: 4, by: "me" });
		const s = store.getState();
		expect(s.board[2]).toBe("4");
		expect(s.pending.size).toBe(0);
		expect(s.version).toBe(1);
		expect(s.players[0].placements).toBe(1);
	});

	it("requests a resync on a version gap instead of applying", () => {
		const { store, sent } = setup();
		store
			.getState()
			.handle({ type: "applied", version: 3, cell: 2, digit: 4, by: "x" });
		expect(store.getState().board).toBe(EASY.givens);
		expect(sent).toContainEqual({ type: "resync" });
		// Stale messages are ignored without a resync.
		sent.length = 0;
		store
			.getState()
			.handle({ type: "notes", version: 0, cell: 2, mask: 1, by: "x" });
		expect(sent).toEqual([]);
	});

	it("flashes a rejected digit for 600 ms and counts the mistake", () => {
		vi.useFakeTimers();
		const { store } = setup();
		store.getState().select(2);
		store.getState().place(1);
		store.getState().handle({ type: "mistake", cell: 2, digit: 1, by: "me" });
		expect(store.getState().flashing.has(2)).toBe(true);
		expect(store.getState().pending.size).toBe(0);
		expect(store.getState().mistakes).toBe(1);
		vi.advanceTimersByTime(MISTAKE_FLASH_MS);
		expect(store.getState().flashing.has(2)).toBe(false);
	});

	it("removes notes from peers when a digit is applied", () => {
		const notes = emptyNotes();
		notes[3] = 1 << 3; // note 4 in a row-mate of cell 2
		const { store } = setup({ notes });
		store
			.getState()
			.handle({ type: "applied", version: 1, cell: 2, digit: 4, by: "x" });
		expect(store.getState().notes[3]).toBe(0);
	});

	it("keeps race notes local", () => {
		const saved: number[][] = [];
		const sent: ClientMessage[] = [];
		const store = createRoomStore((m) => sent.push(m), {
			load: () => null,
			save: (n) => saved.push(n),
		});
		store.getState().handle(snapshot({ mode: "race" }));
		store.getState().select(2);
		store.getState().toggleNote(7);
		expect(store.getState().notes[2]).toBe(1 << 6);
		expect(saved).toHaveLength(1);
		expect(sent.filter((m) => m.type === "note")).toEqual([]);
		expect(sent.filter((m) => m.type === "select")).toEqual([]);
	});

	it("does not move before a race starts", () => {
		const { store, sent } = setup({
			mode: "race",
			startsAt: Date.now() + 60_000,
		});
		store.getState().select(2);
		store.getState().place(4);
		expect(sent.filter((m) => m.type === "place")).toEqual([]);
	});

	it("sends hints and counts them", () => {
		const { store, sent } = setup();
		store.getState().select(2);
		store.getState().hint();
		expect(sent).toContainEqual({ type: "hint", cell: 2 });
		store.getState().handle({
			type: "applied",
			version: 1,
			cell: 2,
			digit: 4,
			by: "me",
			hint: true,
		});
		const s = store.getState();
		expect(s.hints).toBe(1);
		expect(s.players[0]).toMatchObject({ hints: 1, placements: 0, filled: 1 });
	});

	it("undoes note edits by sending the toggles that restore them", () => {
		const { store, sent } = setup();
		store.getState().select(3);
		store.getState().toggleNote(5);
		store
			.getState()
			.handle({ type: "notes", version: 1, cell: 3, mask: 1 << 4, by: "me" });
		store.getState().toggleNote(7);
		store.getState().handle({
			type: "notes",
			version: 2,
			cell: 3,
			mask: (1 << 4) | (1 << 6),
			by: "me",
		});
		store.getState().clearNotes();
		store
			.getState()
			.handle({ type: "notes", version: 3, cell: 3, mask: 0, by: "me" });
		sent.length = 0;

		store.getState().undoNote();
		expect(sent).toEqual([
			{ type: "note", cell: 3, digit: 5 },
			{ type: "note", cell: 3, digit: 7 },
		]);
	});

	it("undoes race notes locally", () => {
		const store = createRoomStore(() => {}, {
			load: () => null,
			save: () => {},
		});
		store.getState().handle(snapshot({ mode: "race" }));
		store.getState().select(2);
		store.getState().toggleNote(1);
		store.getState().toggleNote(2);
		store.getState().undoNote();
		expect(store.getState().notes[2]).toBe(1);
		store.getState().undoNote();
		expect(store.getState().notes[2]).toBe(0);
		store.getState().undoNote();
		expect(store.getState().notes[2]).toBe(0);
	});
});
