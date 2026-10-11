import { IconPencil } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Sheet } from "./Sheet";
import { I, Kbd } from "./ui";

const RULES: {
	mark: ReactNode;
	markClass: string;
	title: string;
	text: string;
}[] = [
	{
		mark: "5",
		markClass: "bg-surface text-pen ring-1 ring-line",
		title: "Correct digits lock",
		text: "They turn pen-blue and can no longer be erased.",
	},
	{
		mark: "7",
		markClass: "bg-flash text-white",
		title: "Wrong digits bounce",
		text: "The cell flashes red, the digit disappears, +10 s.",
	},
	{
		mark: "?",
		markClass: "bg-brand-soft text-brand-strong",
		title: "Hint reveals a cell",
		text: "Select an empty cell first. Costs 30 s.",
	},
	{
		mark: <I icon={IconPencil} size={16} />,
		markClass: "bg-sunken text-ink-2",
		title: "Notes are pencil marks",
		text: "Up to nine per cell. Shared in co-op, private in a race.",
	},
];

/** Modes, the four rules that surprise people, and the score formula. */
export function HowToPlay({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	return (
		<Sheet open={open} onClose={onClose} title="How to play">
			<div className="grid grid-cols-2 gap-2">
				<div className="rounded-md bg-brand-softer p-3">
					<p className="text-[15px] font-bold">Co-op</p>
					<p className="text-[13px] leading-snug text-ink-2">
						One shared board. You see where everyone is.
					</p>
				</div>
				<div className="rounded-md bg-brand-softer p-3">
					<p className="text-[15px] font-bold">Race</p>
					<p className="text-[13px] leading-snug text-ink-2">
						Same puzzle, own boards. Progress only.
					</p>
				</div>
			</div>
			<ul className="flex flex-col gap-4 py-1">
				{RULES.map((r) => (
					<li key={r.title} className="flex gap-3">
						<span
							aria-hidden
							className={`flex size-8 shrink-0 items-center justify-center rounded-sm text-[17px] font-extrabold ${r.markClass}`}
						>
							{r.mark}
						</span>
						<div>
							<p className="text-[15px] font-bold">{r.title}</p>
							<p className="text-sm leading-snug text-ink-2">{r.text}</p>
						</div>
					</li>
				))}
			</ul>
			<p className="rounded-md bg-ink px-4 py-3 text-sm text-surface">
				<strong>Score</strong> = finish time + 10 s per mistake + 30 s per hint.
				Lower is better.
			</p>
		</Sheet>
	);
}

const SHORTCUTS: [string, string[]][] = [
	["Move", ["↑", "↓", "←", "→"]],
	["Move (WASD)", ["W", "A", "S", "D"]],
	["Place a digit", ["1-9"]],
	["Toggle one note", ["⇧", "1-9"]],
	["Notes mode", ["N"]],
	["Clear notes", ["⌫"]],
	["Hint (+30 s)", ["H"]],
	["Undo note", ["⌘/Ctrl", "Z"]],
	["Deselect", ["Esc"]],
	["This sheet", ["?"]],
];

export function ShortcutSheet({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	return (
		<Sheet
			open={open}
			onClose={onClose}
			title="Keyboard shortcuts"
			aside={
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="rounded-xs"
				>
					<Kbd>Esc</Kbd>
				</button>
			}
		>
			<dl className="flex flex-col">
				{SHORTCUTS.map(([label, keys]) => (
					<div
						key={label}
						className="flex items-center justify-between gap-3 border-t border-hair py-3 text-[15px]"
					>
						<dt>{label}</dt>
						<dd className="flex gap-1.5">
							{keys.map((k) => (
								<Kbd key={k}>{k}</Kbd>
							))}
						</dd>
					</div>
				))}
			</dl>
		</Sheet>
	);
}
