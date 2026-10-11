import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { DIFFICULTIES, MODES } from "../../shared/constants";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { SegmentedButtons } from "../components/Segmented";
import { TileArt } from "../components/States";
import { usePageMeta } from "../meta";
import { api, type LeaderboardRow } from "../net/api";
import { useSession } from "../store/session";
import type { Difficulty, Mode } from "../types";

export function Leaderboard() {
	usePageMeta({
		title: "Leaderboard",
		description:
			"The fastest multiplayer sudoku players by mode and difficulty: finish time plus penalties for mistakes and hints.",
		path: "/leaderboard",
	});
	const session = useSession((s) => s.session);
	// Filters live in the URL so a view can be shared and survives reloads.
	const [params, setParams] = useSearchParams();
	const pick = <T extends string>(
		key: string,
		options: readonly T[],
		fallback: T,
	): T => {
		const v = params.get(key);
		return options.includes(v as T) ? (v as T) : fallback;
	};
	const mode = pick<Mode>("mode", MODES, "coop");
	const difficulty = pick<Difficulty>("difficulty", DIFFICULTIES, "easy");
	const set = (key: string, value: string) =>
		setParams(
			(p) => {
				p.set(key, value);
				return p;
			},
			{ replace: true },
		);
	const setMode = (m: Mode) => set("mode", m);
	const setDifficulty = (d: Difficulty) => set("difficulty", d);
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
		<main className="mx-auto flex w-full max-w-[896px] flex-col gap-6 px-4 pt-7 pb-12 md:px-8 lg:pt-14">
			<div className="flex flex-col gap-2">
				<h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] lg:text-5xl">
					Leaderboard
				</h1>
				<p className="text-[17px] text-ink-2">
					Best scores across all rooms. Score = finish time + 10 s per mistake +
					30 s per hint.
				</p>
			</div>
			<div className="flex flex-wrap gap-x-5 gap-y-4">
				<SegmentedButtons
					label="Mode"
					options={MODES}
					value={mode}
					onChange={setMode}
					render={(m) => (m === "coop" ? "Co-op" : "Race")}
				/>
				<div className="min-w-0 max-sm:w-full">
					<SegmentedButtons
						label="Difficulty"
						options={DIFFICULTIES}
						value={difficulty}
						onChange={setDifficulty}
						render={(d) => d[0].toUpperCase() + d.slice(1)}
					/>
				</div>
			</div>
			<section
				aria-busy={rows === null}
				className="rounded-xl bg-surface px-3 py-4 shadow-card sm:px-7 sm:py-6"
			>
				{rows === null ? (
					<div className="flex justify-center py-10">
						<TileArt mood="loading" />
					</div>
				) : (
					<LeaderboardTable
						rows={rows}
						me={session?.userId}
						limit={10}
						caption={`${mode === "coop" ? "Co-op" : "Race"} ${difficulty} leaderboard`}
					/>
				)}
			</section>
		</main>
	);
}
