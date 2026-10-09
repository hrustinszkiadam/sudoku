import { describe, expect, it } from "vitest";
import { EASY, EXPERT_GUESS, EXPERT_XY_WING, HARD, MEDIUM } from "./fixtures";
import {
	boxLineReduction,
	CandidateBoard,
	grade,
	hiddenPair,
	hiddenSingle,
	hiddenTriple,
	nakedPair,
	nakedSingle,
	nakedTriple,
	pointing,
	swordfish,
	xWing,
	xyWing,
} from "./grader";
import { ALL_DIGITS_MASK, bit, maskToDigits, setCell } from "./grid";

const full = () => new Array<number>(81).fill(ALL_DIGITS_MASK);
const digits = (b: CandidateBoard, i: number) => maskToDigits(b.cands[i]);
const without = (...ds: number[]) =>
	ds.reduce((m, d) => m & ~bit(d), ALL_DIGITS_MASK);
const only = (...ds: number[]) => ds.reduce((m, d) => m | bit(d), 0);

describe("singles", () => {
	it("places a naked single", () => {
		const b = CandidateBoard.fromGrid(EASY.givens);
		const n = nakedSingle(b);
		expect(n).toBeGreaterThan(0);
		expect(b.toGrid()).not.toBe(EASY.givens);
	});

	it("places a hidden single", () => {
		const cands = full();
		for (let i = 1; i < 9; i++) cands[i] = without(7);
		const b = CandidateBoard.fromCandidates(cands);
		expect(hiddenSingle(b)).toBeGreaterThan(0);
		expect(b.values[0]).toBe(7);
		expect(digits(b, 9)).not.toContain(7);
	});
});

describe("intersections", () => {
	it("pointing removes a box-confined digit from the rest of the row", () => {
		const cands = full();
		for (const i of [9, 10, 11, 18, 19, 20]) cands[i] = without(5);
		const b = CandidateBoard.fromCandidates(cands);
		expect(pointing(b)).toBe(1);
		for (let i = 3; i < 9; i++) expect(digits(b, i)).not.toContain(5);
		expect(digits(b, 0)).toContain(5);
		expect(digits(b, 12)).toContain(5);
	});

	it("box-line reduction removes a line-confined digit from the rest of the box", () => {
		const cands = full();
		for (let i = 2; i < 9; i++) cands[i] = without(5);
		const b = CandidateBoard.fromCandidates(cands);
		expect(boxLineReduction(b)).toBe(1);
		for (const i of [9, 10, 11, 18, 19, 20]) {
			expect(digits(b, i)).not.toContain(5);
		}
		expect(digits(b, 12)).toContain(5);
	});
});

describe("subsets", () => {
	it("naked pair", () => {
		const cands = full();
		cands[0] = only(1, 2);
		cands[1] = only(1, 2);
		const b = CandidateBoard.fromCandidates(cands);
		expect(nakedPair(b)).toBe(1);
		for (let i = 2; i < 9; i++) expect(b.cands[i]).toBe(without(1, 2));
		expect(digits(b, 0)).toEqual([1, 2]);
	});

	it("hidden pair", () => {
		const cands = full();
		for (let i = 2; i < 9; i++) cands[i] = without(1, 2);
		const b = CandidateBoard.fromCandidates(cands);
		expect(hiddenPair(b)).toBe(1);
		expect(digits(b, 0)).toEqual([1, 2]);
		expect(digits(b, 1)).toEqual([1, 2]);
	});

	it("naked triple", () => {
		const cands = full();
		cands[0] = only(1, 2);
		cands[1] = only(2, 3);
		cands[2] = only(1, 3);
		const b = CandidateBoard.fromCandidates(cands);
		expect(nakedTriple(b)).toBe(1);
		for (let i = 3; i < 9; i++) expect(b.cands[i]).toBe(without(1, 2, 3));
	});

	it("hidden triple", () => {
		const cands = full();
		for (let i = 3; i < 9; i++) cands[i] = without(1, 2, 3);
		const b = CandidateBoard.fromCandidates(cands);
		expect(hiddenTriple(b)).toBe(1);
		for (let i = 0; i < 3; i++) expect(digits(b, i)).toEqual([1, 2, 3]);
	});
});

describe("fish and wings", () => {
	it("x-wing", () => {
		const cands = full();
		for (const row of [0, 4]) {
			for (let c = 0; c < 9; c++) {
				if (c !== 1 && c !== 5) cands[row * 9 + c] = without(1);
			}
		}
		const b = CandidateBoard.fromCandidates(cands);
		expect(xWing(b)).toBe(1);
		for (const row of [1, 2, 3, 5, 6, 7, 8]) {
			expect(digits(b, row * 9 + 1)).not.toContain(1);
			expect(digits(b, row * 9 + 5)).not.toContain(1);
			expect(digits(b, row * 9 + 2)).toContain(1);
		}
		expect(digits(b, 1)).toContain(1);
		expect(digits(b, 41)).toContain(1);
	});

	it("swordfish", () => {
		const cands = full();
		const allowed: Record<number, number[]> = {
			0: [0, 3],
			3: [3, 6],
			6: [0, 6],
		};
		for (const [row, cols] of Object.entries(allowed)) {
			for (let c = 0; c < 9; c++) {
				if (!cols.includes(c)) cands[Number(row) * 9 + c] = without(1);
			}
		}
		const b = CandidateBoard.fromCandidates(cands);
		expect(swordfish(b)).toBe(1);
		for (const row of [1, 2, 4, 5, 7, 8]) {
			for (const col of [0, 3, 6]) {
				expect(digits(b, row * 9 + col)).not.toContain(1);
			}
			expect(digits(b, row * 9 + 1)).toContain(1);
		}
	});

	it("xy-wing", () => {
		const cands = full();
		cands[0] = only(1, 2); // pivot
		cands[4] = only(1, 3); // pincer in the same row
		cands[36] = only(2, 3); // pincer in the same column
		const b = CandidateBoard.fromCandidates(cands);
		expect(xyWing(b)).toBe(1);
		expect(digits(b, 40)).not.toContain(3);
		expect(digits(b, 41)).toContain(3);
	});

	it("returns 0 when nothing applies", () => {
		const b = CandidateBoard.fromCandidates(full());
		for (const t of [pointing, boxLineReduction, nakedPair, xWing, xyWing]) {
			expect(t(b)).toBe(0);
		}
	});
});

describe("grade", () => {
	it("grades each tier", () => {
		expect(grade(EASY.givens)).toMatchObject({
			difficulty: "easy",
			techniques: ["hidden single"],
		});
		const medium = grade(MEDIUM);
		expect(medium.difficulty).toBe("medium");
		expect(medium.techniques).toContain("naked pair");
		const hard = grade(HARD);
		expect(hard.difficulty).toBe("hard");
		expect(hard.techniques).toContain("x-wing");
		const xy = grade(EXPERT_XY_WING);
		expect(xy.difficulty).toBe("expert");
		expect(xy.techniques).toContain("xy-wing");
		expect(xy.techniques).not.toContain("guess");
		const guess = grade(EXPERT_GUESS.givens);
		expect(guess.difficulty).toBe("expert");
		expect(guess.techniques).toContain("guess");
	});

	it("scores harder puzzles higher", () => {
		expect(grade(EXPERT_GUESS.givens).score).toBeGreaterThan(
			grade(EASY.givens).score,
		);
	});

	it("rejects unsolvable puzzles", () => {
		expect(() => grade(setCell(EASY.givens, 2, 5))).toThrow();
	});
});
