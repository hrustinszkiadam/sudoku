import { useEffect, useState } from "react";
import { api, type HistoryGame } from "../net/api";
import { useSession } from "../store/session";
import { formatMs } from "./Timer";

/** The current user's last 20 games. */
export function History() {
	const session = useSession((s) => s.session);
	const [games, setGames] = useState<HistoryGame[] | null>(null);
	useEffect(() => {
		if (!session) return;
		api
			.history()
			.then((r) => setGames(r.games))
			.catch(() => setGames([]));
	}, [session]);

	if (!games?.length) return null;
	return (
		<section className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
			<h2 className="text-lg font-semibold">Your recent games</h2>
			<ul className="flex flex-col gap-1 text-sm">
				{games.map((g) => (
					<li key={g.gameId} className="flex justify-between gap-2">
						<span className="capitalize">
							{g.mode === "coop" ? "Co-op" : "Race"} · {g.difficulty}
							{g.rank ? ` · #${g.rank}` : ""}
						</span>
						<span className="text-slate-500 dark:text-slate-400">
							{g.status === "abandoned"
								? "abandoned"
								: g.scoreMs === null
									? "unfinished"
									: formatMs(g.scoreMs)}
							{" · "}
							{new Date(g.finishedAt).toLocaleDateString()}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
