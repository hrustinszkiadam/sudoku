export interface NumberPadProps {
	notesMode: boolean;
	/** Digits already placed 9 times, shown disabled. */
	completed?: ReadonlySet<number>;
	onDigit: (digit: number) => void;
	onToggleNotes: () => void;
	onClearNotes: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad({
	notesMode,
	completed,
	onDigit,
	onToggleNotes,
	onClearNotes,
}: NumberPadProps) {
	const btn =
		"rounded-md border border-slate-300 bg-white py-2 font-semibold shadow-sm active:scale-95 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 focus-visible:outline-3 focus-visible:outline-amber-500";
	return (
		<div className="flex w-full max-w-[min(100%,32rem)] flex-col gap-2">
			<div className="grid grid-cols-9 gap-1">
				{DIGITS.map((d) => (
					<button
						key={d}
						type="button"
						className={`${btn} text-lg`}
						disabled={completed?.has(d)}
						onClick={() => onDigit(d)}
						aria-label={notesMode ? `Toggle note ${d}` : `Place ${d}`}
					>
						{d}
					</button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-2 text-sm">
				<button
					type="button"
					className={`${btn} ${notesMode ? "bg-amber-100 dark:bg-amber-900" : ""}`}
					aria-pressed={notesMode}
					onClick={onToggleNotes}
				>
					✏️ Notes {notesMode ? "on" : "off"}{" "}
					<kbd className="text-xs opacity-60">N</kbd>
				</button>
				<button type="button" className={btn} onClick={onClearNotes}>
					Clear notes <kbd className="text-xs opacity-60">⌫</kbd>
				</button>
			</div>
		</div>
	);
}
