import {
	IconArrowBackUp,
	IconBackspace,
	IconBulb,
	IconCheck,
	IconPencil,
} from "@tabler/icons-react";
import { I, Kbd } from "./ui";

export interface NumberPadProps {
	notesMode: boolean;
	/** Digits already placed 9 times, shown disabled. */
	completed?: ReadonlySet<number>;
	/** Countdown or game over: keys stay visible but inert. */
	disabled?: boolean;
	onDigit: (digit: number) => void;
	onToggleNotes: () => void;
	onClearNotes: () => void;
	/** Shown only when provided (rooms; not the dev board). */
	onHint?: () => void;
	/** Hint needs an empty selected cell. */
	canHint?: boolean;
	onUndo?: () => void;
	canUndo?: boolean;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** In notes mode each key shows its digit where the note will sit in the cell. */
const NOTE_SPOT = [
	"items-start justify-start",
	"items-start justify-center",
	"items-start justify-end",
	"items-center justify-start",
	"items-center justify-center",
	"items-center justify-end",
	"items-end justify-start",
	"items-end justify-center",
	"items-end justify-end",
];

const key =
	"relative flex h-[52px] items-center justify-center rounded-md border text-2xl leading-none font-bold transition-[translate,box-shadow,background-color] duration-(--duration-instant) lg:h-16 lg:text-[28px]";
const keyPress = "shadow-key active:translate-y-0.5 active:shadow-none";
const keyOn = `border-line bg-raised text-ink active:bg-sunken ${keyPress}`;
const keyNote = `border-line bg-brand-softer text-brand-strong ${keyPress}`;
const keyOff =
	"cursor-not-allowed border-hair bg-sunken text-ink-3 shadow-none";
const tool =
	"flex h-[46px] min-w-0 items-center justify-center gap-[5px] rounded-md border px-1.5 text-sm font-bold whitespace-nowrap transition-[translate,background-color] duration-(--duration-instant) active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 lg:h-12 lg:gap-[7px] lg:px-2.5 lg:text-[15px]";
const toolOn = "border-line bg-raised text-ink can-hover:hover:bg-sunken";
const toolOff = "border-hair bg-sunken text-ink-3";

export function NumberPad({
	notesMode,
	completed,
	disabled = false,
	onDigit,
	onToggleNotes,
	onClearNotes,
	onHint,
	canHint = true,
	onUndo,
	canUndo,
}: NumberPadProps) {
	const hasTools = Boolean(onHint || onUndo);
	return (
		<div className="flex w-full flex-col gap-3.5">
			<div className="flex w-full flex-col gap-1.5 lg:gap-2.5 lg:rounded-[20px] lg:bg-surface lg:p-3.5 lg:shadow-card">
				<div className="grid grid-cols-5 gap-1.5 lg:grid-cols-3 lg:gap-2">
					{DIGITS.map((d, i) => {
						const done = completed?.has(d) ?? false;
						const off = done || disabled;
						return (
							<button
								key={d}
								type="button"
								className={`${key} ${off ? keyOff : notesMode ? keyNote : keyOn}`}
								disabled={off}
								onClick={() => onDigit(d)}
								aria-label={
									done
										? `All nine ${d}s placed`
										: notesMode
											? `Toggle note ${d}`
											: `Place ${d}`
								}
							>
								{notesMode && !done ? (
									<span
										className={`absolute inset-x-2 inset-y-1.5 flex text-[15px] font-extrabold lg:text-[17px] ${NOTE_SPOT[i]}`}
									>
										{d}
									</span>
								) : (
									d
								)}
								{done && (
									<span className="absolute top-1.25 right-1.25 flex size-4 items-center justify-center rounded-full bg-success text-surface">
										<I icon={IconCheck} size={12} stroke={3} />
									</span>
								)}
							</button>
						);
					})}
					<button
						type="button"
						aria-label="Clear notes"
						className={`${key} ${disabled ? keyOff : keyOn} lg:hidden`}
						disabled={disabled}
						onClick={onClearNotes}
					>
						<I icon={IconBackspace} size={24} />
					</button>
				</div>
				<div
					className={`grid gap-1.5 lg:grid-cols-2 lg:gap-2 ${hasTools ? "grid-cols-[1.32fr_0.9fr_1.12fr]" : "grid-cols-1"}`}
				>
					<button
						type="button"
						aria-pressed={notesMode}
						disabled={disabled}
						onClick={onToggleNotes}
						className={`${tool} ${notesMode ? "border-[1.5px] border-brand bg-brand-soft text-brand-strong" : toolOn} disabled:opacity-50`}
					>
						<I icon={IconPencil} />
						Notes
						<span
							className={`inline-flex h-5 items-center rounded-full px-1.75 text-[11px] font-extrabold tracking-[0.04em] uppercase ${notesMode ? "bg-brand text-on-brand" : "bg-sunken text-ink-2"}`}
						>
							{notesMode ? "On" : "Off"}
						</span>
					</button>
					<button
						type="button"
						disabled={disabled}
						onClick={onClearNotes}
						className={`${tool} ${toolOn} hidden disabled:opacity-50 lg:flex`}
					>
						<I icon={IconBackspace} />
						Clear notes
					</button>
					{onUndo && (
						<button
							type="button"
							onClick={onUndo}
							disabled={!canUndo || disabled}
							className={`${tool} ${canUndo && !disabled ? toolOn : toolOff}`}
						>
							<I icon={IconArrowBackUp} />
							<span>
								Undo<span className="hidden lg:inline"> note</span>
							</span>
						</button>
					)}
					{onHint && (
						<button
							type="button"
							onClick={onHint}
							disabled={!canHint || disabled}
							title="Reveals the selected cell; adds 30 s to your score"
							className={`${tool} ${canHint && !disabled ? toolOn : toolOff}`}
						>
							<I icon={IconBulb} />
							Hint
							<span className="text-xs font-extrabold text-ink-3">+30 s</span>
						</button>
					)}
				</div>
			</div>
			<ShortcutLegend />
		</div>
	);
}

/** The six most useful keys; desktop only (hidden on touch-only devices). */
function ShortcutLegend() {
	const items: [string, string][] = [
		["↑↓←→", "move"],
		["1-9", "place"],
		["⇧ 1-9", "note"],
		["N", "notes"],
		["⌫", "clear notes"],
		["⌘Z", "undo"],
		["H", "hint"],
		["?", "all shortcuts"],
	];
	return (
		<ul
			aria-label="Keyboard shortcuts"
			className="hidden flex-wrap gap-x-3.5 gap-y-2 px-1 text-[13px] text-ink-2 can-hover:lg:flex"
		>
			{items.map(([k, label]) => (
				<li key={label} className="flex items-center gap-1.5">
					<Kbd>{k}</Kbd>
					{label}
				</li>
			))}
		</ul>
	);
}
