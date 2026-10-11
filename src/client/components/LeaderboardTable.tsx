import type { LeaderboardRow } from "../net/api";
import { TileArt } from "./States";
import { formatMs } from "./Timer";

const MEDAL = [
	"bg-accent text-[#151D33]",
	"bg-[#C5CCDA] text-[#151D33] dark:bg-[#8C95AB]",
	"bg-[#E6A877] text-[#151D33] dark:bg-[#C98A55]",
];

function Rank({ n }: { n: number }) {
	return n <= 3 ? (
		<span
			className={`inline-flex size-[26px] items-center justify-center rounded-sm font-mono text-[13px] font-bold ${MEDAL[n - 1]}`}
		>
			{n}
		</span>
	) : (
		<span className="inline-flex w-[26px] justify-center font-mono text-[13px] font-bold text-ink-2">
			{n}
		</span>
	);
}

/**
 * Best times. Shows the top `limit` rows; when you're further down, your own
 * row stays pinned below the table.
 */
export function LeaderboardTable({
	rows,
	me,
	caption,
	limit = rows.length,
	empty = "Be the first name on this board.",
}: {
	rows: readonly LeaderboardRow[];
	me?: string;
	caption: string;
	limit?: number;
	empty?: string;
}) {
	if (rows.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 py-8 text-center">
				<TileArt mood="daily" />
				<p className="mt-2 text-lg font-extrabold">No results yet.</p>
				<p className="text-[15px] text-ink-2">{empty}</p>
			</div>
		);
	}
	const shown = rows.slice(0, limit);
	const myIndex = me ? rows.findIndex((r) => r.userId === me) : -1;
	const pinned = myIndex >= limit ? rows[myIndex] : null;
	const cell = "px-1.5 py-3";
	return (
		<>
			<table className="w-full border-collapse text-left text-[15px] tabular">
				<caption className="sr-only">{caption}</caption>
				<thead>
					<tr className="text-xs font-extrabold tracking-[0.06em] text-ink-3 uppercase">
						<th scope="col" className="w-10 px-1.5 pb-2 text-center">
							#
						</th>
						<th scope="col" className="px-1.5 pb-2">
							Player
						</th>
						<th scope="col" className="px-1.5 pb-2 text-right">
							Best
						</th>
						<th scope="col" className="w-16 px-1.5 pb-2 text-right">
							Games
						</th>
					</tr>
				</thead>
				<tbody>
					{shown.map((r, i) => {
						const you = r.userId === me;
						return (
							<tr
								key={r.userId}
								className={`[&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md ${you ? "bg-brand-soft" : "even:bg-sunken/70"}`}
							>
								<td className={`${cell} text-center`}>
									<Rank n={i + 1} />
								</td>
								<td className={`${cell} max-w-0 w-full`}>
									<span className="flex min-w-0 items-center gap-1.5">
										<span className="truncate font-bold">{r.name}</span>
										{you && <span className="shrink-0 text-ink-3">(you)</span>}
									</span>
								</td>
								<td className={`${cell} text-right font-mono font-bold`}>
									{formatMs(r.bestMs)}
								</td>
								<td className={`${cell} text-right text-ink-2`}>{r.games}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{pinned && (
				<p className="mt-3 flex items-center gap-3 rounded-md bg-brand-soft px-3.5 py-3 text-[15px] ">
					<span className="font-mono font-bold text-ink-2">{myIndex + 1}</span>
					<span className="min-w-0 truncate font-bold">{pinned.name}</span>
					<span className="shrink-0 text-ink-3">(you)</span>
					<span className="ml-auto font-mono font-bold">
						{formatMs(pinned.bestMs)}
					</span>
				</p>
			)}
		</>
	);
}
