import { useEffect, useRef } from "react";

export interface BoardActions {
	selected: number | null;
	select: (cell: number | null) => void;
	place: (digit: number) => void;
	toggleNote: (digit: number) => void;
	clearNotes: () => void;
	toggleNotesMode: () => void;
	notesMode: boolean;
	hint?: () => void;
	undoNote?: () => void;
}

const MOVES: Record<string, [number, number]> = {
	ArrowUp: [-1, 0],
	ArrowDown: [1, 0],
	ArrowLeft: [0, -1],
	ArrowRight: [0, 1],
	KeyW: [-1, 0],
	KeyS: [1, 0],
	KeyA: [0, -1],
	KeyD: [0, 1],
};

/** Digit from `event.code` so Shift+1 still reads as 1 on any layout. */
function digitFromCode(code: string): number | null {
	const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
	return m ? Number(m[1]) : null;
}

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Arrows / WASD move, 1-9 place (or note in notes mode), Shift+1-9 toggles a
 * note, N toggles notes mode, Backspace/Delete clears notes, Esc deselects,
 * H asks for a hint and Ctrl/Cmd+Z undoes the last note change (when supported).
 */
export function useBoardKeyboard(actions: BoardActions, enabled = true) {
	const ref = useRef(actions);
	ref.current = actions;

	useEffect(() => {
		if (!enabled) return;
		const onKey = (e: KeyboardEvent) => {
			if (isTyping(e.target)) return;
			const a = ref.current;
			if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
				if (a.undoNote) {
					e.preventDefault();
					a.undoNote();
				}
				return;
			}
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			const move = MOVES[e.code];
			if (move) {
				e.preventDefault();
				const cur = a.selected ?? 40;
				const r = (Math.floor(cur / 9) + move[0] + 9) % 9;
				const c = ((cur % 9) + move[1] + 9) % 9;
				a.select(a.selected === null ? 40 : r * 9 + c);
				return;
			}
			const digit = digitFromCode(e.code);
			if (digit !== null) {
				if (a.selected === null) return;
				e.preventDefault();
				if (e.shiftKey || a.notesMode) a.toggleNote(digit);
				else a.place(digit);
				return;
			}
			switch (e.code) {
				case "KeyN":
					e.preventDefault();
					a.toggleNotesMode();
					break;
				case "KeyH":
					if (a.hint && a.selected !== null) {
						e.preventDefault();
						a.hint();
					}
					break;
				case "Backspace":
				case "Delete":
					if (a.selected !== null) {
						e.preventDefault();
						a.clearNotes();
					}
					break;
				case "Escape":
					a.select(null);
					break;
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [enabled]);
}
