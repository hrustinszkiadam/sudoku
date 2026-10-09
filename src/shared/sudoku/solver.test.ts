import { describe, expect, it } from "vitest";
import { EASY, EXPERT_GUESS, HARD, MEDIUM } from "./fixtures";
import { isComplete, setCell } from "./grid";
import { mulberry32 } from "./rng";
import { countSolutions, hasUniqueSolution, solve } from "./solver";

const EMPTY = "0".repeat(81);

describe("solve", () => {
	it("solves known puzzles", () => {
		expect(solve(EASY.givens)).toBe(EASY.solution);
		expect(solve(EXPERT_GUESS.givens)).toBe(EXPERT_GUESS.solution);
	});

	it("keeps the givens and returns a complete grid", () => {
		for (const puzzle of [MEDIUM, HARD]) {
			const s = solve(puzzle);
			expect(s).not.toBeNull();
			expect(isComplete(s ?? "")).toBe(true);
			for (let i = 0; i < 81; i++) {
				if (puzzle[i] !== "0") expect(s?.[i]).toBe(puzzle[i]);
			}
		}
	});

	it("returns null for unsolvable or malformed input", () => {
		// Conflicting givens.
		expect(solve(setCell(EASY.givens, 2, 5))).toBeNull();
		// No conflicts in the givens, but cell 8 has no candidate left.
		const stuck = `12345678000000000900000000${"0".repeat(55)}`;
		expect(solve(stuck)).toBeNull();
		expect(solve("abc")).toBeNull();
	});

	it("uses the rng to pick among many solutions", () => {
		const a = solve(EMPTY, mulberry32(1));
		const b = solve(EMPTY, mulberry32(2));
		expect(isComplete(a ?? "")).toBe(true);
		expect(isComplete(b ?? "")).toBe(true);
		expect(a).not.toBe(b);
		expect(solve(EMPTY, mulberry32(1))).toBe(a);
	});
});

describe("countSolutions", () => {
	it("counts 0, 1 and many", () => {
		expect(countSolutions(setCell(EASY.givens, 2, 5))).toBe(0);
		expect(countSolutions(EASY.givens)).toBe(1);
		expect(countSolutions(EMPTY)).toBe(2);
		expect(countSolutions(EMPTY, 10)).toBe(10);
	});

	it("distinguishes unique and ambiguous partial grids", () => {
		// Emptying one full row of a solution: each cell is forced by its column.
		expect(countSolutions(`${"0".repeat(9)}${EASY.solution.slice(9)}`)).toBe(1);
		// Emptying a whole band of three rows leaves the rows free to permute.
		expect(countSolutions(`${"0".repeat(27)}${EASY.solution.slice(27)}`)).toBe(
			2,
		);
	});

	it("agrees with hasUniqueSolution", () => {
		expect(hasUniqueSolution(EASY.givens)).toBe(true);
		expect(hasUniqueSolution(EMPTY)).toBe(false);
	});
});
