import { describe, expect, it } from "vitest";
import { bit, peers } from "./grid";
import {
	emptyNotes,
	hasNote,
	isNotesArray,
	removeNoteFromPeers,
	toggleNote,
} from "./notes";

describe("notes", () => {
	it("toggles and reads single notes", () => {
		let m = 0;
		m = toggleNote(m, 3);
		m = toggleNote(m, 7);
		expect(hasNote(m, 3)).toBe(true);
		expect(hasNote(m, 7)).toBe(true);
		expect(hasNote(m, 4)).toBe(false);
		m = toggleNote(m, 3);
		expect(hasNote(m, 3)).toBe(false);
	});

	it("removes a digit from every peer without mutating the input", () => {
		const notes = emptyNotes().map(() => bit(4) | bit(5));
		const out = removeNoteFromPeers(notes, 40, 4);
		for (const p of peers(40)) expect(out[p]).toBe(bit(5));
		expect(out[40]).toBe(bit(4) | bit(5));
		expect(out[0]).toBe(bit(4) | bit(5));
		expect(notes[41]).toBe(bit(4) | bit(5));
	});

	it("validates notes arrays", () => {
		expect(isNotesArray(emptyNotes())).toBe(true);
		expect(isNotesArray([1, 2, 3])).toBe(false);
		expect(isNotesArray(emptyNotes().map(() => 512))).toBe(false);
		expect(isNotesArray("nope")).toBe(false);
	});
});
