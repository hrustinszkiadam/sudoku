import type { Difficulty } from "../constants";
import { DIFFICULTIES } from "../constants";
import {
	ALL_DIGITS_MASK,
	BOXES,
	bit,
	CELL_COUNT,
	COLS,
	digitAt,
	maskToDigits,
	peers,
	popcount,
	ROWS,
	UNITS,
} from "./grid";
import { solve } from "./solver";

/** Values plus pencil-mark candidates, used by the human-style solver. */
export class CandidateBoard {
	readonly values: number[];
	readonly cands: number[];

	private constructor(values: number[], cands: number[]) {
		this.values = values;
		this.cands = cands;
	}

	static fromGrid(grid: string): CandidateBoard {
		const board = new CandidateBoard(
			new Array<number>(CELL_COUNT).fill(0),
			new Array<number>(CELL_COUNT).fill(ALL_DIGITS_MASK),
		);
		for (let i = 0; i < CELL_COUNT; i++) {
			const d = digitAt(grid, i);
			if (d !== 0) board.place(i, d);
		}
		return board;
	}

	/** Raw constructor for tests: explicit candidate masks, no placed values. */
	static fromCandidates(cands: number[]): CandidateBoard {
		return new CandidateBoard(new Array<number>(CELL_COUNT).fill(0), cands);
	}

	place(i: number, d: number): void {
		this.values[i] = d;
		this.cands[i] = 0;
		const clear = ~bit(d);
		for (const p of peers(i)) this.cands[p] &= clear;
	}

	/** Removes `mask` from cell i's candidates. Returns true if anything changed. */
	eliminate(i: number, mask: number): boolean {
		const before = this.cands[i];
		this.cands[i] &= ~mask;
		return this.cands[i] !== before;
	}

	get solved(): boolean {
		return this.values.every((v) => v !== 0);
	}

	toGrid(): string {
		return this.values.join("");
	}
}

/** Cells of `unit` that still have `d` as a candidate. */
const positions = (b: CandidateBoard, unit: readonly number[], d: number) =>
	unit.filter((i) => b.cands[i] & bit(d));

function* combinations<T>(items: readonly T[], k: number): Generator<T[]> {
	const n = items.length;
	if (k > n) return;
	const idx = Array.from({ length: k }, (_, i) => i);
	while (true) {
		yield idx.map((i) => items[i]);
		let i = k - 1;
		while (i >= 0 && idx[i] === n - k + i) i--;
		if (i < 0) return;
		idx[i]++;
		for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
	}
}

/** Each technique returns how many times it was applied (0 = no progress). */
type Apply = (b: CandidateBoard) => number;

export const nakedSingle: Apply = (b) => {
	let n = 0;
	for (let i = 0; i < CELL_COUNT; i++) {
		if (b.values[i] === 0 && popcount(b.cands[i]) === 1) {
			b.place(i, maskToDigits(b.cands[i])[0]);
			n++;
		}
	}
	return n;
};

export const hiddenSingle: Apply = (b) => {
	let n = 0;
	for (const unit of UNITS) {
		for (let d = 1; d <= 9; d++) {
			const pos = positions(b, unit, d);
			if (pos.length === 1) {
				b.place(pos[0], d);
				n++;
			}
		}
	}
	return n;
};

const nakedSubset =
	(k: number): Apply =>
	(b) => {
		for (const unit of UNITS) {
			const open = unit.filter((i) => {
				const c = popcount(b.cands[i]);
				return b.values[i] === 0 && c >= 2 && c <= k;
			});
			for (const combo of combinations(open, k)) {
				const union = combo.reduce((m, i) => m | b.cands[i], 0);
				if (popcount(union) !== k) continue;
				let changed = false;
				for (const i of unit) {
					if (b.values[i] === 0 && !combo.includes(i)) {
						changed = b.eliminate(i, union) || changed;
					}
				}
				if (changed) return 1;
			}
		}
		return 0;
	};

const hiddenSubset =
	(k: number): Apply =>
	(b) => {
		for (const unit of UNITS) {
			const digits: number[] = [];
			const where = new Map<number, number[]>();
			for (let d = 1; d <= 9; d++) {
				const pos = positions(b, unit, d);
				if (pos.length >= 2 && pos.length <= k) {
					digits.push(d);
					where.set(d, pos);
				}
			}
			for (const combo of combinations(digits, k)) {
				const cells = new Set(combo.flatMap((d) => where.get(d) ?? []));
				if (cells.size !== k) continue;
				const keep = combo.reduce((m, d) => m | bit(d), 0);
				let changed = false;
				for (const i of cells) {
					changed = b.eliminate(i, ALL_DIGITS_MASK & ~keep) || changed;
				}
				if (changed) return 1;
			}
		}
		return 0;
	};

/** Cells in `a` that are not in `b`. */
const minus = (a: readonly number[], b: readonly number[]) =>
	a.filter((i) => !b.includes(i));

/** A digit confined to one row/column of a box is removed from the rest of that line. */
export const pointing: Apply = (b) => {
	for (const box of BOXES) {
		for (let d = 1; d <= 9; d++) {
			const pos = positions(b, box, d);
			if (pos.length < 2) continue;
			for (const lines of [ROWS, COLS]) {
				const line = lines.find((l) => pos.every((i) => l.includes(i)));
				if (!line) continue;
				let changed = false;
				for (const i of minus(line, box)) {
					changed = b.eliminate(i, bit(d)) || changed;
				}
				if (changed) return 1;
			}
		}
	}
	return 0;
};

/** A digit confined to one box within a row/column is removed from the rest of that box. */
export const boxLineReduction: Apply = (b) => {
	for (const line of [...ROWS, ...COLS]) {
		for (let d = 1; d <= 9; d++) {
			const pos = positions(b, line, d);
			if (pos.length < 2) continue;
			const box = BOXES.find((bx) => pos.every((i) => bx.includes(i)));
			if (!box) continue;
			let changed = false;
			for (const i of minus(box, line)) {
				changed = b.eliminate(i, bit(d)) || changed;
			}
			if (changed) return 1;
		}
	}
	return 0;
};

/** Basic fish of size k: X-Wing (2) and Swordfish (3). */
const fish =
	(k: number): Apply =>
	(b) => {
		for (let d = 1; d <= 9; d++) {
			for (const [bases, covers] of [
				[ROWS, COLS],
				[COLS, ROWS],
			] as const) {
				// For each base line, the set of cover-line indices holding d.
				const candidates: { base: number; coverMask: number }[] = [];
				bases.forEach((line, base) => {
					const pos = positions(b, line, d);
					if (pos.length < 2 || pos.length > k) return;
					const coverMask = pos.reduce(
						(m, i) => m | (1 << covers.findIndex((c) => c.includes(i))),
						0,
					);
					candidates.push({ base, coverMask });
				});
				for (const combo of combinations(candidates, k)) {
					const union = combo.reduce((m, c) => m | c.coverMask, 0);
					if (popcount(union) !== k) continue;
					const baseSet = new Set(combo.map((c) => c.base));
					let changed = false;
					covers.forEach((cover, ci) => {
						if (!(union & (1 << ci))) return;
						for (const i of cover) {
							const base = bases.findIndex((l) => l.includes(i));
							if (!baseSet.has(base)) {
								changed = b.eliminate(i, bit(d)) || changed;
							}
						}
					});
					if (changed) return 1;
				}
			}
		}
		return 0;
	};

export const nakedPair = nakedSubset(2);
export const nakedTriple = nakedSubset(3);
export const hiddenPair = hiddenSubset(2);
export const hiddenTriple = hiddenSubset(3);
export const xWing = fish(2);
export const swordfish = fish(3);

/** Pivot {x,y} sees pincers {x,z} and {y,z}; z is removed from cells seeing both pincers. */
export const xyWing: Apply = (b) => {
	const bivalue: number[] = [];
	for (let i = 0; i < CELL_COUNT; i++) {
		if (b.values[i] === 0 && popcount(b.cands[i]) === 2) bivalue.push(i);
	}
	for (const pivot of bivalue) {
		const pm = b.cands[pivot];
		const wings = bivalue.filter(
			(i) =>
				i !== pivot &&
				peers(pivot).includes(i) &&
				popcount(b.cands[i] & pm) === 1,
		);
		for (const [a, c] of combinations(wings, 2)) {
			const am = b.cands[a];
			const cm = b.cands[c];
			// Pincers must share pivot digits that differ, and one extra digit z.
			if ((am & pm) === (cm & pm)) continue;
			const z = am & ~pm;
			if (z !== (cm & ~pm) || popcount(z) !== 1) continue;
			let changed = false;
			for (const i of peers(a)) {
				if (i !== c && b.values[i] === 0 && peers(c).includes(i)) {
					changed = b.eliminate(i, z) || changed;
				}
			}
			if (changed) return 1;
		}
	}
	return 0;
};

interface Technique {
	name: string;
	level: Difficulty;
	weight: number;
	apply: Apply;
}

/** In order of difficulty; the grader always retries the easiest first. */
export const TECHNIQUES: readonly Technique[] = [
	{ name: "hidden single", level: "easy", weight: 1, apply: hiddenSingle },
	{ name: "naked single", level: "easy", weight: 2, apply: nakedSingle },
	{ name: "pointing", level: "medium", weight: 5, apply: pointing },
	{
		name: "box-line reduction",
		level: "medium",
		weight: 5,
		apply: boxLineReduction,
	},
	{ name: "naked pair", level: "medium", weight: 6, apply: nakedPair },
	{ name: "hidden pair", level: "medium", weight: 8, apply: hiddenPair },
	{ name: "naked triple", level: "hard", weight: 10, apply: nakedTriple },
	{ name: "hidden triple", level: "hard", weight: 12, apply: hiddenTriple },
	{ name: "x-wing", level: "hard", weight: 15, apply: xWing },
	{ name: "xy-wing", level: "expert", weight: 20, apply: xyWing },
	{ name: "swordfish", level: "expert", weight: 25, apply: swordfish },
];

const GUESS_WEIGHT = 50;

export interface Grade {
	difficulty: Difficulty;
	score: number;
	techniques: string[];
}

/**
 * Grades a puzzle by solving it like a human: always applies the easiest
 * technique that makes progress, and records the hardest one needed. When no
 * technique applies, it "guesses" a cell from the solution (expert).
 */
export function grade(puzzle: string): Grade {
	const solution = solve(puzzle);
	if (!solution) throw new Error("Cannot grade an unsolvable puzzle");

	const board = CandidateBoard.fromGrid(puzzle);
	const used = new Set<string>();
	let level = 0;
	let score = 0;

	while (!board.solved) {
		const technique = TECHNIQUES.find((t) => {
			const n = t.apply(board);
			if (n > 0) score += n * t.weight;
			return n > 0;
		});
		if (technique) {
			used.add(technique.name);
			level = Math.max(level, DIFFICULTIES.indexOf(technique.level));
			continue;
		}
		// Stuck: guess the most constrained cell from the known solution.
		let best = -1;
		for (let i = 0; i < CELL_COUNT; i++) {
			if (
				board.values[i] === 0 &&
				(best === -1 || popcount(board.cands[i]) < popcount(board.cands[best]))
			) {
				best = i;
			}
		}
		board.place(best, digitAt(solution, best));
		used.add("guess");
		score += GUESS_WEIGHT;
		level = DIFFICULTIES.indexOf("expert");
	}

	return {
		difficulty: DIFFICULTIES[level],
		score,
		techniques: TECHNIQUES.map((t) => t.name)
			.concat("guess")
			.filter((n) => used.has(n)),
	};
}
