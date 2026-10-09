import { bit, CELL_COUNT, peers } from "./grid";

/** Notes: number[81], each a 9-bit mask (bit d-1 set means note d is present). */
export type Notes = number[];

export const emptyNotes = (): Notes => new Array<number>(CELL_COUNT).fill(0);

export const hasNote = (mask: number, digit: number): boolean =>
	(mask & bit(digit)) !== 0;

export const toggleNote = (mask: number, digit: number): number =>
	mask ^ bit(digit);

/** Returns new notes with `digit` removed from every peer of `cell`. */
export function removeNoteFromPeers(
	notes: Notes,
	cell: number,
	digit: number,
): Notes {
	const out = notes.slice();
	const clear = ~bit(digit);
	for (const p of peers(cell)) out[p] &= clear;
	return out;
}

export const isNotesArray = (value: unknown): value is Notes =>
	Array.isArray(value) &&
	value.length === CELL_COUNT &&
	value.every((m) => Number.isInteger(m) && m >= 0 && m <= 0x1ff);
