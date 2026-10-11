import { IconFlag, IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api, type HistoryGame } from "../net/api";
import { useSession } from "../store/session";
import { ordinal } from "./room/People";
import { formatMs } from "./Timer";
import { I } from "./ui";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** "Today, 21:14", "Yesterday, 22:05" or "6 Oct, 19:40" in local time. */
function when(ms: number): string {
	const d = new Date(ms);
	const time = d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
	const day = new Date(d).setHours(0, 0, 0, 0);
	const today = new Date().setHours(0, 0, 0, 0);
	if (day === today) return `Today, ${time}`;
	if (today - day === 86_400_000) return `Yesterday, ${time}`;
	return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${time}`;
}

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
		<section className="flex flex-col rounded-xl lg:col-start-1 lg:row-start-1 bg-surface px-4 pt-5 pb-2 shadow-card sm:px-6">
			<div className="mb-2 flex items-baseline justify-between">
				<h2 className="text-lg font-extrabold">Your recent games</h2>
				<span className="text-[13px] text-ink-3">Last 20</span>
			</div>
			<ul>
				{games.map((g) => (
					<li
						key={g.gameId}
						className="flex items-center gap-3.5 border-t border-hair py-3.5"
					>
						<span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-sunken text-ink-2">
							<I icon={g.mode === "coop" ? IconUsers : IconFlag} size={18} />
						</span>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="truncate text-[15px] font-bold">
								{g.mode === "coop" ? "Co-op" : "Race"} · {cap(g.difficulty)}
								{g.rank ? ` · ${ordinal(g.rank)}` : ""}
							</span>
							<span className="text-[13px] text-ink-2">
								{when(g.finishedAt)}
							</span>
						</div>
						<span
							className={
								g.status === "abandoned" || g.scoreMs === null
									? "text-sm text-ink-2"
									: "font-mono text-base font-bold tabular"
							}
						>
							{g.status === "abandoned"
								? "abandoned"
								: g.scoreMs === null
									? "unfinished"
									: formatMs(g.scoreMs)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
