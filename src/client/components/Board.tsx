import { useEffect, useMemo, useRef } from "react";
import {
	boxOf,
	colOf,
	conflicts,
	digitAt,
	rowOf,
	setCell,
} from "../../shared/sudoku/grid";
import { Cell, type CellVisitor } from "./Cell";
import { initialOf } from "./ui";

export interface OtherSelection {
	cell: number;
	pencil: number;
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
	/** Cells flashing red, with the rejected digit. */
	flashing?: ReadonlyMap<number, number>;
	/** Co-op: cells a teammate just filled, with their pencil. */
	recent?: ReadonlyMap<number, number>;
	others?: readonly OtherSelection[];
	/** Finished game: same visuals, no selection, nothing to press. */
	readOnly?: boolean;
	celebrate?: boolean;
	label?: string;
	onSelect: (cell: number) => void;
}

const NONE = new Map<number, number>();
const NO_OTHERS: CellVisitor[] = [];

/** Tag text per visitor: one initial, or two letters when initials collide. */
function tagsFor(others: readonly OtherSelection[]): CellVisitor[] {
	const firstTwo = (name: string) => {
		const seg = [...new Intl.Segmenter().segment(name.trim())].map(
			(s) => s.segment,
		);
		return (seg[0] ?? "?").toLocaleUpperCase() + (seg[1] ?? "");
	};
	return others.map((o) => {
		const initial = initialOf(o.name);
		const clash = others.some((x) => x !== o && initialOf(x.name) === initial);
		return {
			pencil: o.pencil,
			name: o.name,
			tag: clash ? firstTwo(o.name) : initial,
		};
	});
}

export function Board({
	givens,
	board,
	notes,
	selected,
	pending = NONE,
	flashing = NONE,
	recent = NONE,
	others = [],
	readOnly = false,
	celebrate = false,
	label = "Sudoku board",
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
		const grouped = new Map<number, OtherSelection[]>();
		for (const o of others)
			grouped.set(o.cell, [...(grouped.get(o.cell) ?? []), o]);
		const out = new Map<number, CellVisitor[]>();
		for (const [cell, list] of grouped) out.set(cell, tagsFor(list));
		return out;
	}, [others]);

	// Move keyboard focus to the selected cell, unless focus is elsewhere (e.g. a button).
	useEffect(() => {
		const root = ref.current;
		const active = document.activeElement;
		const free = !active || active === document.body || root?.contains(active);
		if (selected === null || !root || !free) return;
		root.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus();
	}, [selected]);

	const sel = readOnly ? null : selected;
	const selDigit = sel === null || flashing.has(sel) ? 0 : digitAt(shown, sel);

	return (
		<div className="@container w-full max-w-lg [--digit:calc(7.7px+4.35cqw)] [--note:calc(3.26px+1.9cqw)] [--tag-f:8.5px] [--tag:13px] @[420px]:[--tag-f:11px] @[420px]:[--tag:17px]">
			<fieldset
				ref={ref}
				aria-label={label}
				className="m-0 grid aspect-square w-full min-w-0 grid-cols-9 grid-rows-9 rounded-[10px] border-2 border-box-line bg-cell p-0 @[420px]:rounded-[14px]"
			>
				{Array.from({ length: 81 }, (_, i) => {
					const digit = digitAt(shown, i);
					const related =
						sel !== null &&
						i !== sel &&
						(rowOf(i) === rowOf(sel) ||
							colOf(i) === colOf(sel) ||
							boxOf(i) === boxOf(sel));
					return (
						<Cell
							// biome-ignore lint/suspicious/noArrayIndexKey: cells are fixed positions
							key={i}
							index={i}
							digit={digit}
							given={givens[i] !== "0"}
							notes={notes[i] ?? 0}
							selected={sel === i}
							related={related}
							sameDigit={selDigit !== 0 && i !== sel && digit === selDigit}
							conflict={bad.has(i)}
							pending={pending.has(i)}
							flash={flashing.get(i) ?? 0}
							placedBy={recent.get(i) ?? 0}
							others={readOnly ? NO_OTHERS : (othersByCell.get(i) ?? NO_OTHERS)}
							readOnly={readOnly}
							wave={celebrate}
							onSelect={onSelect}
						/>
					);
				})}
			</fieldset>
		</div>
	);
}
