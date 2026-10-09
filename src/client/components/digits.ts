import { digitAt } from "../../shared/sudoku/grid";

/** Digits that already appear 9 times on the board. */
export function completedDigits(board: string): Set<number> {
	const counts = new Array<number>(10).fill(0);
	for (let i = 0; i < 81; i++) counts[digitAt(board, i)]++;
	const out = new Set<number>();
	for (let d = 1; d <= 9; d++) if (counts[d] >= 9) out.add(d);
	return out;
}
