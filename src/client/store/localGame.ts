import { create } from "zustand";
import { countFilled, digitAt, setCell } from "../../shared/sudoku/grid";
import {
	emptyNotes,
	type Notes,
	removeNoteFromPeers,
	toggleNote,
} from "../../shared/sudoku/notes";

/** In-memory engine for /dev/board: any digit may be placed, conflicts are only highlighted. */
interface LocalGame {
	givens: string;
	board: string;
	notes: Notes;
	selected: number | null;
	notesMode: boolean;
	load: (givens: string) => void;
	select: (cell: number | null) => void;
	place: (digit: number) => void;
	toggleNote: (digit: number) => void;
	clearNotes: () => void;
	toggleNotesMode: () => void;
}

export const useLocalGame = create<LocalGame>((set, get) => ({
	givens: "0".repeat(81),
	board: "0".repeat(81),
	notes: emptyNotes(),
	selected: null,
	notesMode: false,
	load: (givens) =>
		set({ givens, board: givens, notes: emptyNotes(), selected: null }),
	select: (selected) => set({ selected }),
	place: (digit) => {
		const { givens, board, notes, selected } = get();
		if (selected === null || givens[selected] !== "0") return;
		// Placing the same digit again erases it.
		const next = digitAt(board, selected) === digit ? 0 : digit;
		const cleared = notes.slice();
		cleared[selected] = 0;
		set({
			board: setCell(board, selected, next),
			notes: next ? removeNoteFromPeers(cleared, selected, next) : cleared,
		});
	},
	toggleNote: (digit) => {
		const { board, notes, selected } = get();
		if (selected === null || digitAt(board, selected) !== 0) return;
		const next = notes.slice();
		next[selected] = toggleNote(next[selected], digit);
		set({ notes: next });
	},
	clearNotes: () => {
		const { notes, selected } = get();
		if (selected === null) return;
		const next = notes.slice();
		next[selected] = 0;
		set({ notes: next });
	},
	toggleNotesMode: () => set((s) => ({ notesMode: !s.notesMode })),
}));

export const isBoardFull = (board: string) => countFilled(board) === 81;
