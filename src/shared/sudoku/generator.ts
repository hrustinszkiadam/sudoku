import type { Difficulty } from "../constants";
import { type Grade, grade } from "./grader";
import { CELL_COUNT, EMPTY } from "./grid";
import { type Rng, shuffle } from "./rng";
import { hasUniqueSolution, solve } from "./solver";

export interface GeneratedPuzzle extends Grade {
	givens: string;
	solution: string;
}

const EMPTY_GRID = EMPTY.repeat(CELL_COUNT);

/**
 * Fewest clues to leave per target. Hard and expert carve to a minimal puzzle;
 * easier targets stop earlier so they stay friendly for humans.
 */
const MIN_CLUES: Record<Difficulty, number> = {
	easy: 36,
	medium: 30,
	hard: 17,
	expert: 17,
};

/** A random complete, valid grid. */
export function randomSolution(rng: Rng): string {
	const solution = solve(EMPTY_GRID, rng);
	if (!solution) throw new Error("Empty grid has no solution");
	return solution;
}

/**
 * Removes clues in random, 180°-rotationally symmetric pairs, keeping each
 * removal only while the puzzle still has a unique solution.
 */
export function carve(rng: Rng, solution: string, minClues = 17): string {
	const cells = solution.split("");
	let clues = CELL_COUNT;
	const pairs = shuffle(
		rng,
		Array.from({ length: 41 }, (_, i) => i),
	);
	for (const i of pairs) {
		const j = CELL_COUNT - 1 - i;
		const removing = i === j ? 1 : 2;
		if (clues - removing < minClues) continue;
		const keepI = cells[i];
		const keepJ = cells[j];
		cells[i] = EMPTY;
		cells[j] = EMPTY;
		if (hasUniqueSolution(cells.join(""))) {
			clues -= removing;
		} else {
			cells[i] = keepI;
			cells[j] = keepJ;
		}
	}
	return cells.join("");
}

/** One random puzzle, graded, with no target. */
export function generateAny(rng: Rng, minClues = 17): GeneratedPuzzle {
	const solution = randomSolution(rng);
	const givens = carve(rng, solution, minClues);
	return { givens, solution, ...grade(givens) };
}

/** Generates puzzles until one grades as `target`. */
export function generate(
	rng: Rng,
	target: Difficulty,
	maxAttempts = 10_000,
): GeneratedPuzzle {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const puzzle = generateAny(rng, MIN_CLUES[target]);
		if (puzzle.difficulty === target) return puzzle;
	}
	throw new Error(`No ${target} puzzle after ${maxAttempts} attempts`);
}
