import {
	ALL_DIGITS_MASK,
	boxOf,
	CELL_COUNT,
	colOf,
	digitAt,
	isGridString,
	maskToDigits,
	popcount,
	rowOf,
} from "./grid";
import { type Rng, shuffle } from "./rng";

const ROW = Array.from({ length: CELL_COUNT }, (_, i) => rowOf(i));
const COL = Array.from({ length: CELL_COUNT }, (_, i) => colOf(i));
const BOX = Array.from({ length: CELL_COUNT }, (_, i) => boxOf(i));

interface State {
	cells: number[];
	rows: number[];
	cols: number[];
	boxes: number[];
}

/** Builds the bitmask state, or null if the givens already conflict. */
function initState(grid: string): State | null {
	if (!isGridString(grid)) return null;
	const s: State = {
		cells: new Array<number>(CELL_COUNT).fill(0),
		rows: new Array<number>(9).fill(0),
		cols: new Array<number>(9).fill(0),
		boxes: new Array<number>(9).fill(0),
	};
	for (let i = 0; i < CELL_COUNT; i++) {
		const d = digitAt(grid, i);
		if (d === 0) continue;
		const b = 1 << (d - 1);
		if ((s.rows[ROW[i]] | s.cols[COL[i]] | s.boxes[BOX[i]]) & b) return null;
		s.cells[i] = d;
		s.rows[ROW[i]] |= b;
		s.cols[COL[i]] |= b;
		s.boxes[BOX[i]] |= b;
	}
	return s;
}

/**
 * Depth-first search with the most-constrained-cell heuristic. Calls `visit`
 * for each solution; stops as soon as `visit` returns true.
 */
function search(s: State, visit: (cells: number[]) => boolean, rng?: Rng) {
	let best = -1;
	let bestMask = 0;
	let bestCount = 10;
	for (let i = 0; i < CELL_COUNT; i++) {
		if (s.cells[i] !== 0) continue;
		const mask =
			ALL_DIGITS_MASK & ~(s.rows[ROW[i]] | s.cols[COL[i]] | s.boxes[BOX[i]]);
		const count = popcount(mask);
		if (count === 0) return false;
		if (count < bestCount) {
			best = i;
			bestMask = mask;
			bestCount = count;
			if (count === 1) break;
		}
	}
	if (best === -1) return visit(s.cells);

	const digits = rng
		? shuffle(rng, maskToDigits(bestMask))
		: maskToDigits(bestMask);
	const r = ROW[best];
	const c = COL[best];
	const bx = BOX[best];
	for (const d of digits) {
		const b = 1 << (d - 1);
		s.cells[best] = d;
		s.rows[r] |= b;
		s.cols[c] |= b;
		s.boxes[bx] |= b;
		if (search(s, visit, rng)) return true;
		s.rows[r] &= ~b;
		s.cols[c] &= ~b;
		s.boxes[bx] &= ~b;
	}
	s.cells[best] = 0;
	return false;
}

/** Returns the first solution found, or null if there is none. */
export function solve(grid: string, rng?: Rng): string | null {
	const s = initState(grid);
	if (!s) return null;
	let result: string | null = null;
	search(
		s,
		(cells) => {
			result = cells.join("");
			return true;
		},
		rng,
	);
	return result;
}

/** Counts solutions, stopping early once `limit` is reached. */
export function countSolutions(grid: string, limit = 2): number {
	const s = initState(grid);
	if (!s) return 0;
	let count = 0;
	search(s, () => ++count >= limit);
	return count;
}

/** True when the puzzle has exactly one solution. */
export const hasUniqueSolution = (grid: string): boolean =>
	countSolutions(grid, 2) === 1;
