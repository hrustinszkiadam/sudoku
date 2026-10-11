import { type CSSProperties, memo } from "react";
import { maskToDigits } from "../../shared/sudoku/grid";

/** Another player's cursor on this cell. */
export interface CellVisitor {
	pencil: number;
	name: string;
	/** Initial(s) shown on the tag: two letters when initials collide. */
	tag: string;
}

export interface CellProps {
	index: number;
	digit: number;
	given: boolean;
	notes: number;
	selected: boolean;
	related: boolean;
	sameDigit: boolean;
	conflict: boolean;
	pending: boolean;
	/** The rejected digit while the cell flashes red, else 0. */
	flash: number;
	/** Pencil of a teammate who just filled this cell, else 0. */
	placedBy: number;
	others: readonly CellVisitor[];
	readOnly: boolean;
	/** Win: sweep the success tint diagonally across the board. */
	wave: boolean;
	onSelect: (index: number) => void;
}

const row = (i: number) => Math.floor(i / 9);
const col = (i: number) => i % 9;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function describe(p: CellProps): string {
	const parts = [`Row ${row(p.index) + 1}, column ${col(p.index) + 1}`];
	if (p.flash) parts.push(`empty, wrong ${p.flash}`);
	else if (p.digit) {
		parts.push(String(p.digit));
		if (p.given) parts.push("given");
		if (p.pending) parts.push("pending");
	} else {
		parts.push("empty");
		const notes = maskToDigits(p.notes);
		if (notes.length) parts.push(`notes ${notes.join(" ")}`);
	}
	if (p.conflict) parts.push("conflict");
	if (p.others.length)
		parts.push(`selected by ${p.others.map((o) => o.name).join(" and ")}`);
	return parts.join(", ");
}

/** Fill precedence: flash > selected > conflict > same digit > related > cell. */
function fill(p: CellProps): string {
	if (p.flash) return "bg-flash";
	if (p.readOnly) return "bg-cell";
	if (p.selected)
		return "bg-selected shadow-[inset_0_0_0_2px_var(--color-selected-edge)]";
	if (p.conflict) return "bg-danger-soft";
	if (p.sameDigit) return "bg-same";
	if (p.related) return "bg-related";
	return "bg-cell can-hover:hover:bg-related";
}

/** The four corner cells follow the frame's radius (frame minus its border). */
const CORNER: Record<number, string> = {
	0: "rounded-tl-[8px] @[420px]:rounded-tl-[12px]",
	8: "rounded-tr-[8px] @[420px]:rounded-tr-[12px]",
	72: "rounded-bl-[8px] @[420px]:rounded-bl-[12px]",
	80: "rounded-br-[8px] @[420px]:rounded-br-[12px]",
};

/** Ring sides for 1-4 visitors: all, L-shapes, A B C A, one side each. */
function ringColors(others: readonly CellVisitor[]): string {
	const c = others.map((o) => `var(--color-p${o.pencil})`);
	const sides =
		c.length === 1
			? [c[0], c[0], c[0], c[0]]
			: c.length === 2
				? [c[0], c[0], c[1], c[1]]
				: c.length === 3
					? [c[0], c[1], c[2], c[0]]
					: c.slice(0, 4);
	return sides.join(" ");
}

function Tags({
	others,
	max,
	className,
}: {
	others: readonly CellVisitor[];
	max: number;
	className: string;
}) {
	const shown = others.length > max ? others.slice(0, max - 1) : others;
	const tag =
		"block h-(--tag) min-w-(--tag) rounded-xs px-0.5 text-center text-(length:--tag-f) leading-(--tag) font-extrabold";
	return (
		<span
			aria-hidden
			className={`pointer-events-none absolute top-0.5 right-0.5 z-1 gap-px ${className}`}
		>
			{shown.map((o) => (
				<span
					key={o.name + o.pencil}
					className={`${tag} shadow-[0_0_0_1px_var(--color-cell)]`}
					style={{
						background: `var(--color-p${o.pencil})`,
						color: `var(--color-p${o.pencil}-on)`,
					}}
				>
					{o.tag}
				</span>
			))}
			{others.length > max && (
				<span className={`${tag} bg-ink text-surface`}>
					+{others.length - shown.length}
				</span>
			)}
		</span>
	);
}

export const Cell = memo(function Cell(props: CellProps) {
	const { index, digit, notes, others, onSelect, flash } = props;
	const r = row(index);
	const c = col(index);
	const shown = flash || digit;
	const corner = CORNER[index] ?? "";

	const digitClass = flash
		? "text-white font-semibold digit-shake"
		: [
				props.conflict && !props.readOnly
					? "digit-conflict"
					: props.given
						? "text-given"
						: "text-pen",
				props.given ? "font-extrabold" : "font-semibold",
				props.pending ? "scale-[.86] opacity-45" : "scale-100 opacity-100",
				props.placedBy ? "digit-arrive" : "",
			].join(" ");

	return (
		<button
			type="button"
			data-cell={index}
			aria-label={describe(props)}
			aria-pressed={props.selected}
			disabled={props.readOnly}
			tabIndex={props.selected || (index === 0 && !props.selected) ? 0 : -1}
			onClick={() => onSelect(index)}
			style={props.wave ? { animationDelay: `${(r + c) * 30}ms` } : undefined}
			className={[
				"cell relative flex min-h-0 min-w-0 items-center justify-center select-none",
				"transition-colors duration-(--duration-fast) ease-out active:brightness-95 disabled:cursor-default",
				c === 8
					? ""
					: c === 2 || c === 5
						? "border-r-2 border-r-box-line"
						: "border-r border-r-cell-line",
				r === 8
					? ""
					: r === 2 || r === 5
						? "border-b-2 border-b-box-line"
						: "border-b border-b-cell-line",
				corner,
				fill(props),
				props.wave ? "cell-wave" : "",
			].join(" ")}
		>
			{shown ? (
				<span
					className={`text-(length:--digit) leading-none transition-[scale,opacity] duration-200 ease-settle ${digitClass}`}
				>
					{shown}
				</span>
			) : notes ? (
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0.5 grid grid-cols-3 grid-rows-3 @[420px]:inset-1"
				>
					{DIGITS.map((d) => (
						<span
							key={d}
							className={`flex items-center justify-center text-(length:--note) leading-none font-bold ${props.selected ? "text-note-strong" : "text-note"}`}
						>
							{notes & (1 << (d - 1)) ? d : ""}
						</span>
					))}
				</span>
			) : null}
			{props.placedBy > 0 && (
				<span
					aria-hidden
					className={`cell-ring ring-fade ${corner}`}
					style={
						{ "--ring": `var(--color-p${props.placedBy})` } as CSSProperties
					}
				/>
			)}
			{others.length > 0 && (
				<>
					<span
						aria-hidden
						className={`cell-ring presence-in ${corner}`}
						style={
							{
								"--ring": `var(--color-p${others[0].pencil})`,
								borderColor: ringColors(others),
							} as CSSProperties
						}
					/>
					<Tags others={others} max={2} className="flex @[420px]:hidden" />
					<Tags others={others} max={3} className="hidden @[420px]:flex" />
				</>
			)}
		</button>
	);
});
