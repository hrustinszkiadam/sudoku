import { describe, expect, it } from "vitest";
import { DIFFICULTIES } from "../constants";
import { carve, generate, generateAny, randomSolution } from "./generator";
import { countFilled, isComplete } from "./grid";
import { mulberry32, randInt, shuffle } from "./rng";
import { countSolutions, solve } from "./solver";

describe("rng", () => {
	it("is deterministic per seed and in [0, 1)", () => {
		const a = mulberry32(42);
		const b = mulberry32(42);
		for (let i = 0; i < 100; i++) {
			const x = a();
			expect(x).toBe(b());
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
		expect(mulberry32(1)()).not.toBe(mulberry32(2)());
	});

	it("shuffles into a permutation and draws ints in range", () => {
		const rng = mulberry32(3);
		const items = [1, 2, 3, 4, 5, 6, 7, 8];
		const out = shuffle(rng, items);
		expect([...out].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		for (let i = 0; i < 50; i++) {
			const n = randInt(rng, 5);
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThan(5);
		}
	});
});

describe("generator", () => {
	it("builds a random complete solution", () => {
		const s = randomSolution(mulberry32(1));
		expect(isComplete(s)).toBe(true);
		expect(randomSolution(mulberry32(1))).toBe(s);
	});

	it("carves a symmetric, unique-solution puzzle", () => {
		const rng = mulberry32(5);
		const solution = randomSolution(rng);
		const givens = carve(rng, solution);
		expect(countSolutions(givens)).toBe(1);
		expect(solve(givens)).toBe(solution);
		for (let i = 0; i < 81; i++) {
			expect(givens[i] === "0").toBe(givens[80 - i] === "0");
			if (givens[i] !== "0") expect(givens[i]).toBe(solution[i]);
		}
	});

	it("respects a minimum clue count", () => {
		const rng = mulberry32(6);
		const givens = carve(rng, randomSolution(rng), 40);
		expect(countFilled(givens)).toBeGreaterThanOrEqual(40);
	});

	it.each(DIFFICULTIES)("generates a unique %s puzzle", (difficulty) => {
		const p = generate(mulberry32(11), difficulty);
		expect(p.difficulty).toBe(difficulty);
		expect(countSolutions(p.givens)).toBe(1);
		expect(solve(p.givens)).toBe(p.solution);
	});

	it("is reproducible from a seed", () => {
		expect(generateAny(mulberry32(9)).givens).toBe(
			generateAny(mulberry32(9)).givens,
		);
	});

	it("gives up after maxAttempts", () => {
		expect(() => generate(mulberry32(1), "hard", 1)).toThrow(/hard/);
	});
});
