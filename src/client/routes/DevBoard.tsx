import { useEffect, useMemo } from "react";
import { conflicts, isComplete } from "../../shared/sudoku/grid";
import { Board } from "../components/Board";
import { completedDigits } from "../components/digits";
import { NumberPad } from "../components/NumberPad";
import { useBoardKeyboard } from "../components/useBoardKeyboard";
import { usePageMeta } from "../meta";
import { useLocalGame } from "../store/localGame";

const PUZZLE =
	"530070000600195000098000060800060003400803001700020006060000280000419005000080079";

/** Development-only playground for the board component. */
export function DevBoard() {
	usePageMeta({ title: "Dev board", noindex: true });
	const game = useLocalGame();
	const { load } = game;
	useEffect(() => load(PUZZLE), [load]);
	useBoardKeyboard(game);

	const done = useMemo(() => completedDigits(game.board), [game.board]);
	const solved = isComplete(game.board);

	return (
		<main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-6">
			<h1 className="font-display text-2xl font-extrabold">Dev board</h1>
			<p className="text-sm text-ink-2" aria-live="polite">
				{solved ? "Solved!" : `${conflicts(game.board).size} conflicting cells`}
			</p>
			<Board
				givens={game.givens}
				board={game.board}
				notes={game.notes}
				selected={game.selected}
				onSelect={game.select}
			/>
			<NumberPad
				notesMode={game.notesMode}
				completed={done}
				onDigit={(d) => (game.notesMode ? game.toggleNote(d) : game.place(d))}
				onToggleNotes={game.toggleNotesMode}
				onClearNotes={game.clearNotes}
			/>
		</main>
	);
}
