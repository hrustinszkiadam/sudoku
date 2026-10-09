import { memo } from "react";
import { maskToDigits } from "../../shared/sudoku/grid";

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
	flashing: boolean;
	/** Other players whose selection is on this cell. */
	others: readonly { color: string; name: string }[];
	onSelect: (index: number) => void;
}

const row = (i: number) => Math.floor(i / 9);
const col = (i: number) => i % 9;

function describe(p: CellProps): string {
	const parts = [`Row ${row(p.index) + 1}, column ${col(p.index) + 1}`];
	if (p.digit) {
		parts.push(String(p.digit));
		if (p.given) parts.push("given");
		if (p.pending) parts.push("pending");
	} else {
		parts.push("empty");
		const notes = maskToDigits(p.notes);
		if (notes.length) parts.push(`notes ${notes.join(" ")}`);
	}
	if (p.conflict) parts.push("conflict");
	if (p.flashing) parts.push("wrong");
	for (const o of p.others) parts.push(`selected by ${o.name}`);
	return parts.join(", ");
}

function background(p: CellProps): string {
	if (p.flashing) return "bg-red-300 dark:bg-red-800";
	if (p.selected) return "bg-sky-200 dark:bg-sky-800";
	if (p.conflict) return "bg-red-50 dark:bg-red-950";
	if (p.sameDigit) return "bg-sky-100 dark:bg-sky-950";
	if (p.related) return "bg-slate-100 dark:bg-slate-800";
	return "bg-white dark:bg-slate-900";
}

function text(p: CellProps): string {
	if (p.given) return "font-bold text-slate-900 dark:text-slate-100";
	if (p.conflict) return "text-red-600 dark:text-red-400";
	if (p.pending) return "text-sky-700/50 dark:text-sky-300/50 italic";
	return "text-sky-700 dark:text-sky-300";
}

export const Cell = memo(function Cell(props: CellProps) {
	const { index, digit, notes, others, onSelect } = props;
	const thickRight = col(index) === 2 || col(index) === 5;
	const thickBottom = row(index) === 2 || row(index) === 5;
	const outline = others[0]?.color;

	return (
		<button
			type="button"
			data-cell={index}
			aria-label={describe(props)}
			aria-pressed={props.selected}
			tabIndex={props.selected || (index === 0 && !props.selected) ? 0 : -1}
			onClick={() => onSelect(index)}
			style={outline ? { boxShadow: `inset 0 0 0 3px ${outline}` } : undefined}
			className={[
				"relative flex aspect-square items-center justify-center select-none",
				"border-slate-300 dark:border-slate-700",
				"focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-500",
				col(index) < 8 ? "border-r" : "",
				row(index) < 8 ? "border-b" : "",
				thickRight
					? "border-r-2 border-r-slate-700 dark:border-r-slate-300"
					: "",
				thickBottom
					? "border-b-2 border-b-slate-700 dark:border-b-slate-300"
					: "",
				background(props),
				"transition-colors duration-150",
			].join(" ")}
		>
			{digit ? (
				<span
					className={`text-[clamp(1.1rem,5vw,1.75rem)] leading-none ${text(props)} ${
						props.conflict ? "underline decoration-wavy decoration-2" : ""
					}`}
				>
					{digit}
				</span>
			) : notes ? (
				<span className="grid h-full w-full grid-cols-3 grid-rows-3 p-px text-[clamp(0.5rem,2.2vw,0.7rem)] leading-none text-slate-500 dark:text-slate-400">
					{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
						<span key={d} className="flex items-center justify-center">
							{notes & (1 << (d - 1)) ? d : ""}
						</span>
					))}
				</span>
			) : null}
			{others.length > 0 && (
				<span
					aria-hidden
					className="absolute top-0 right-0.5 text-[0.55rem] leading-tight font-semibold"
					style={{ color: outline }}
				>
					{others.map((o) => o.name.charAt(0)).join("")}
				</span>
			)}
		</button>
	);
});
