import { useEffect, useMemo, useRef } from "react";
import {
	boxOf,
	colOf,
	conflicts,
	digitAt,
	rowOf,
	setCell,
} from "../../shared/sudoku/grid";
import { Cell } from "./Cell";

export interface OtherSelection {
	cell: number;
	color: string;
	name: string;
}

export interface BoardProps {
	givens: string;
	/** Current digits, givens included. */
	board: string;
	notes: readonly number[];
	selected: number | null;
	/** Optimistic placements awaiting the server, shown dimmed. */
	pending?: ReadonlyMap<number, number>;
	/** Cells flashing red after a rejected digit. */
	flashing?: ReadonlySet<number>;
	others?: readonly OtherSelection[];
	onSelect: (cell: number) => void;
}

const NONE = new Map<number, number>();
const NO_CELLS = new Set<number>();
const NO_OTHERS: OtherSelection[] = [];

export function Board({
	givens,
	board,
	notes,
	selected,
	pending = NONE,
	flashing = NO_CELLS,
	others = NO_OTHERS,
	onSelect,
}: BoardProps) {
	const ref = useRef<HTMLFieldSetElement>(null);

	const shown = useMemo(() => {
		let g = board;
		for (const [cell, digit] of pending) g = setCell(g, cell, digit);
		return g;
	}, [board, pending]);
	const bad = useMemo(() => conflicts(shown), [shown]);
	const othersByCell = useMemo(() => {
		const map = new Map<number, OtherSelection[]>();
		for (const o of others) map.set(o.cell, [...(map.get(o.cell) ?? []), o]);
		return map;
	}, [others]);

	// Move keyboard focus to the selected cell, unless focus is elsewhere (e.g. a button).
	useEffect(() => {
		const root = ref.current;
		const active = document.activeElement;
		const free = !active || active === document.body || root?.contains(active);
		if (selected === null || !root || !free) return;
		root.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus();
	}, [selected]);

	const selDigit = selected === null ? 0 : digitAt(shown, selected);

	return (
		<fieldset
			ref={ref}
			aria-label="Sudoku board"
			className="m-0 min-w-0 p-0 grid w-full max-w-[min(100%,32rem)] grid-cols-9 overflow-hidden rounded-md border-2 border-slate-700 dark:border-slate-300"
		>
			{Array.from({ length: 81 }, (_, i) => {
				const digit = digitAt(shown, i);
				const related =
					selected !== null &&
					(rowOf(i) === rowOf(selected) ||
						colOf(i) === colOf(selected) ||
						boxOf(i) === boxOf(selected));
				return (
					<Cell
						// biome-ignore lint/suspicious/noArrayIndexKey: cells are fixed positions
						key={i}
						index={i}
						digit={digit}
						given={givens[i] !== "0"}
						notes={notes[i] ?? 0}
						selected={selected === i}
						related={related}
						sameDigit={selDigit !== 0 && digit === selDigit}
						conflict={bad.has(i)}
						pending={pending.has(i)}
						flashing={flashing.has(i)}
						others={othersByCell.get(i) ?? NO_OTHERS}
						onSelect={onSelect}
					/>
				);
			})}
		</fieldset>
	);
}
