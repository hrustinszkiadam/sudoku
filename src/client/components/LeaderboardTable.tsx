import type { LeaderboardRow } from "../net/api";
import { formatMs } from "./Timer";

export function LeaderboardTable({
	rows,
	me,
	caption,
}: {
	rows: readonly LeaderboardRow[];
	me?: string;
	caption: string;
}) {
	if (rows.length === 0) {
		return (
			<p className="text-sm text-slate-500 dark:text-slate-400">
				No results yet.
			</p>
		);
	}
	return (
		<table className="w-full text-left text-sm">
			<caption className="sr-only">{caption}</caption>
			<thead>
				<tr className="text-slate-500 dark:text-slate-400">
					<th className="py-1">#</th>
					<th className="py-1">Player</th>
					<th className="py-1 text-right">Best</th>
					<th className="py-1 text-right">Games</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r, i) => (
					<tr key={r.userId} className={r.userId === me ? "font-semibold" : ""}>
						<td className="py-1">{i + 1}</td>
						<td className="py-1">
							{r.name}
							{r.userId === me && " (you)"}
						</td>
						<td className="py-1 text-right font-mono">{formatMs(r.bestMs)}</td>
						<td className="py-1 text-right">{r.games}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
