import { useState } from "react";

const KEY = "sudoku:tip-seen";

function seen(): boolean {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return true;
	}
}

/** One-time tip in the first room, pointing at the board. Dismissal is stored locally. */
export function OnboardingTip({ onRules }: { onRules: () => void }) {
	const [show, setShow] = useState(() => !seen());
	if (!show) return null;
	const dismiss = () => {
		try {
			localStorage.setItem(KEY, "1");
		} catch {
			// Storage disabled: the tip just shows again next time.
		}
		setShow(false);
	};
	return (
		<aside
			aria-label="Tip"
			className="results-rise relative rounded-lg bg-[#151D33] p-4 text-[#EDF0F7] shadow-float dark:bg-raised dark:ring-1 dark:ring-line"
		>
			<span
				aria-hidden
				className="absolute -top-2 left-14 size-4 rotate-45 rounded-xs bg-inherit lg:hidden"
			/>
			<p className="text-base font-bold">
				Tap a cell, then a number. Turn on Notes for pencil marks.
			</p>
			<p className="mt-2 text-sm text-[#B4BACB]">
				Wrong digits bounce and add 10 s. The coloured rings are your friends'
				cursors.
			</p>
			<div className="mt-3 flex items-center justify-between">
				<button
					type="button"
					onClick={onRules}
					className="text-sm font-extrabold text-[#90AEFF] underline underline-offset-2"
				>
					All rules
				</button>
				<button
					type="button"
					onClick={dismiss}
					className="h-10 rounded-md bg-[#7699FB] px-4 text-[15px] font-extrabold text-[#090E1B] active:translate-y-px"
				>
					Got it
				</button>
			</div>
		</aside>
	);
}
