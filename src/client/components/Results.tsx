import type { Result } from "../types";
import { formatMs } from "./Timer";

export function Results({
	results,
	me,
	race,
}: {
	results: readonly Result[];
	me: string;
	race: boolean;
}) {
	return (
		<section
			aria-live="polite"
			className="w-full rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-950"
		>
			<h2 className="mb-2 text-lg font-bold">
				{race ? "🏁 Race over" : "🎉 Solved together!"}
			</h2>
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="text-slate-500 dark:text-slate-400">
						{race && <th className="py-1">#</th>}
						<th className="py-1">Player</th>
						<th className="py-1 text-right">Placed</th>
						<th className="py-1 text-right">Mistakes</th>
						<th className="py-1 text-right">{race ? "Score" : "Time"}</th>
					</tr>
				</thead>
				<tbody>
					{results.map((r) => (
						<tr
							key={r.userId}
							className={r.userId === me ? "font-semibold" : ""}
						>
							{race && <td className="py-1">{r.rank ?? "–"}</td>}
							<td className="py-1">{r.name}</td>
							<td className="py-1 text-right">{r.placements}</td>
							<td className="py-1 text-right">{r.mistakes}</td>
							<td className="py-1 text-right font-mono">
								{race
									? r.scoreMs === null
										? "DNF"
										: formatMs(r.scoreMs)
									: r.finishMs === null
										? "–"
										: formatMs(r.finishMs)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{race && (
				<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
					Score = finish time + 10 s per mistake.
				</p>
			)}
		</section>
	);
}
