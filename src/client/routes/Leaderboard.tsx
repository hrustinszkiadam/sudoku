import { useEffect, useState } from "react";
import { DIFFICULTIES, MODES } from "../../shared/constants";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { usePageMeta } from "../meta";
import { api, type LeaderboardRow } from "../net/api";
import { useSession } from "../store/session";
import type { Difficulty, Mode } from "../types";

const tab = (active: boolean) =>
	`rounded-md border px-3 py-1 text-sm capitalize ${
		active
			? "border-sky-600 bg-sky-50 font-semibold dark:bg-sky-950"
			: "border-slate-300 dark:border-slate-600"
	}`;

export function Leaderboard() {
	usePageMeta({
		title: "Leaderboard",
		description:
			"The fastest multiplayer sudoku players by mode and difficulty: finish time plus penalties for mistakes and hints.",
		path: "/leaderboard",
	});
	const session = useSession((s) => s.session);
	const [difficulty, setDifficulty] = useState<Difficulty>("easy");
	const [mode, setMode] = useState<Mode>("coop");
	const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

	useEffect(() => {
		if (!session) return;
		setRows(null);
		api
			.leaderboard(difficulty, mode)
			.then((r) => setRows(r.rows))
			.catch(() => setRows([]));
	}, [session, difficulty, mode]);

	return (
		<main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
			<h1 className="text-2xl font-bold">Leaderboard</h1>
			<p className="text-sm text-slate-500 dark:text-slate-400">
				Best score per player: finish time + 10 s per mistake + 30 s per hint.
			</p>
			<fieldset className="flex flex-wrap gap-2">
				<legend className="sr-only">Mode</legend>
				{MODES.map((m) => (
					<button
						key={m}
						type="button"
						className={tab(mode === m)}
						aria-pressed={mode === m}
						onClick={() => setMode(m)}
					>
						{m === "coop" ? "Co-op" : "Race"}
					</button>
				))}
			</fieldset>
			<fieldset className="flex flex-wrap gap-2">
				<legend className="sr-only">Difficulty</legend>
				{DIFFICULTIES.map((d) => (
					<button
						key={d}
						type="button"
						className={tab(difficulty === d)}
						aria-pressed={difficulty === d}
						onClick={() => setDifficulty(d)}
					>
						{d}
					</button>
				))}
			</fieldset>
			{rows === null ? (
				<p className="text-slate-500">Loading…</p>
			) : (
				<LeaderboardTable
					rows={rows}
					me={session?.userId}
					caption={`${mode} ${difficulty} leaderboard`}
				/>
			)}
		</main>
	);
}
