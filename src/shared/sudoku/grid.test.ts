import { describe, expect, it } from "vitest";
import { EASY } from "./fixtures";
import {
	BOXES,
	bit,
	boxOf,
	COLS,
	colOf,
	conflicts,
	countFilled,
	digitAt,
	isCellIndex,
	isComplete,
	isGridString,
	isSolved,
	maskToDigits,
	peers,
	popcount,
	ROWS,
	rowOf,
	setCell,
	UNITS,
} from "./grid";

describe("coordinates", () => {
	it("maps indices to row, column and box", () => {
		expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
		expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
		expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
		expect([rowOf(23), colOf(23), boxOf(23)]).toEqual([2, 5, 1]);
		expect(boxOf(9 * 6 + 2)).toBe(6);
	});

	it("validates cell indices", () => {
		expect(isCellIndex(0)).toBe(true);
		expect(isCellIndex(80)).toBe(true);
		expect(isCellIndex(81)).toBe(false);
		expect(isCellIndex(-1)).toBe(false);
		expect(isCellIndex(1.5)).toBe(false);
	});
});

describe("units and peers", () => {
	it("has 27 units of 9 distinct cells", () => {
		expect(UNITS).toHaveLength(27);
		expect(ROWS).toHaveLength(9);
		expect(COLS).toHaveLength(9);
		expect(BOXES).toHaveLength(9);
		for (const unit of UNITS) expect(new Set(unit).size).toBe(9);
		expect(BOXES[4]).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50]);
	});

	it("gives every cell 20 distinct peers, excluding itself", () => {
		for (let i = 0; i < 81; i++) {
			const p = peers(i);
			expect(p).toHaveLength(20);
			expect(new Set(p).size).toBe(20);
			expect(p).not.toContain(i);
		}
		expect(peers(0)).toContain(8);
		expect(peers(0)).toContain(72);
		expect(peers(0)).toContain(20);
		expect(peers(0)).not.toContain(30);
	});
});

describe("grid strings", () => {
	it("checks format", () => {
		expect(isGridString(EASY.givens)).toBe(true);
		expect(isGridString("1".repeat(80))).toBe(false);
		expect(isGridString(`${"0".repeat(80)}x`)).toBe(false);
	});

	it("reads, writes and counts cells", () => {
		expect(digitAt(EASY.givens, 0)).toBe(5);
		expect(digitAt(EASY.givens, 2)).toBe(0);
		const g = setCell(EASY.givens, 2, 4);
		expect(digitAt(g, 2)).toBe(4);
		expect(g).toHaveLength(81);
		expect(countFilled(EASY.givens)).toBe(30);
		expect(countFilled(EASY.solution)).toBe(81);
	});
});

describe("conflicts", () => {
	it("finds none in a valid puzzle", () => {
		expect(conflicts(EASY.givens).size).toBe(0);
		expect(conflicts(EASY.solution).size).toBe(0);
	});

	it("flags repeats in a row, column and box", () => {
		// Cell 2 shares row 0 with the 5 in cell 0 and box 0 with it as well.
		expect([...conflicts(setCell(EASY.givens, 2, 5))].sort()).toEqual([0, 2]);
		// Cell 27 (row 3, col 0) = 6 repeats the 6 in cell 9 (column 0).
		const col = setCell("0".repeat(81), 9, 6);
		expect([...conflicts(setCell(col, 72, 6))].sort((a, b) => a - b)).toEqual([
			9, 72,
		]);
		const box = setCell(setCell("0".repeat(81), 30, 1), 50, 1);
		expect([...conflicts(box)].sort()).toEqual([30, 50]);
	});
});

describe("completion", () => {
	it("detects complete and solved grids", () => {
		expect(isComplete(EASY.solution)).toBe(true);
		expect(isComplete(EASY.givens)).toBe(false);
		const swapped = `${EASY.solution[1]}${EASY.solution[0]}${EASY.solution.slice(2)}`;
		expect(isComplete(swapped)).toBe(false);
		expect(isSolved(EASY.solution, EASY.solution)).toBe(true);
		expect(isSolved(EASY.givens, EASY.solution)).toBe(false);
	});
});

describe("bit helpers", () => {
	it("converts masks", () => {
		expect(bit(1)).toBe(1);
		expect(bit(9)).toBe(256);
		expect(popcount(0)).toBe(0);
		expect(popcount(0b101101)).toBe(4);
		expect(maskToDigits(bit(2) | bit(4) | bit(7))).toEqual([2, 4, 7]);
	});
});
