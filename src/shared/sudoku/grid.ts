/**
 * Grid representation: an 81-character string, '1'-'9' for digits and '0' for
 * empty. Cell index i = row * 9 + col.
 */

export const CELL_COUNT = 81;
export const EMPTY = "0";
export const ALL_DIGITS_MASK = 0b1_1111_1111;

export const rowOf = (i: number): number => Math.floor(i / 9);
export const colOf = (i: number): number => i % 9;
export const boxOf = (i: number): number =>
	Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** The 27 units: rows 0-8, columns 9-17, boxes 18-26. Each lists 9 cell indices. */
export const UNITS: readonly (readonly number[])[] = [
	...range(9).map((r) => range(9).map((c) => r * 9 + c)),
	...range(9).map((c) => range(9).map((r) => r * 9 + c)),
	...range(9).map((b) => range(81).filter((i) => boxOf(i) === b)),
];

export const ROWS = UNITS.slice(0, 9);
export const COLS = UNITS.slice(9, 18);
export const BOXES = UNITS.slice(18, 27);

const PEERS: readonly (readonly number[])[] = range(81).map((i) =>
	range(81).filter(
		(j) =>
			j !== i &&
			(rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)),
	),
);

/** The 20 cells sharing a row, column or box with cell i. */
export const peers = (i: number): readonly number[] => PEERS[i];

export const isCellIndex = (i: number): boolean =>
	Number.isInteger(i) && i >= 0 && i < CELL_COUNT;

/** True for an 81-char string of '0'-'9'. Does not check sudoku rules. */
export const isGridString = (s: string): boolean => /^[0-9]{81}$/.test(s);

export const digitAt = (grid: string, i: number): number =>
	grid.charCodeAt(i) - 48;

export const setCell = (grid: string, i: number, digit: number): string =>
	grid.slice(0, i) + String(digit) + grid.slice(i + 1);

export const countFilled = (grid: string): number => {
	let n = 0;
	for (let i = 0; i < CELL_COUNT; i++) if (grid[i] !== EMPTY) n++;
	return n;
};

/** Cells whose digit repeats elsewhere in the same row, column or box. */
export function conflicts(grid: string): Set<number> {
	const out = new Set<number>();
	for (const unit of UNITS) {
		const seen = new Map<number, number[]>();
		for (const i of unit) {
			const d = digitAt(grid, i);
			if (d === 0) continue;
			const cells = seen.get(d);
			if (cells) cells.push(i);
			else seen.set(d, [i]);
		}
		for (const cells of seen.values()) {
			if (cells.length > 1) for (const i of cells) out.add(i);
		}
	}
	return out;
}

/** Every cell filled and no conflicts. */
export const isComplete = (grid: string): boolean =>
	isGridString(grid) && !grid.includes(EMPTY) && conflicts(grid).size === 0;

export const isSolved = (grid: string, solution: string): boolean =>
	grid === solution && isComplete(grid);

export const popcount = (mask: number): number => {
	let n = 0;
	let m = mask;
	while (m) {
		m &= m - 1;
		n++;
	}
	return n;
};

/** Digit (1-9) to its bit. */
export const bit = (digit: number): number => 1 << (digit - 1);

/** Digits present in a 9-bit mask, ascending. */
export const maskToDigits = (mask: number): number[] => {
	const out: number[] = [];
	for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d);
	return out;
};
