import type { Player } from "../types";

export interface PlayerListProps {
	players: readonly Player[];
	me: string;
	hostId: string;
	/** Race: show progress bars. */
	progress?: { total: number };
}

export function PlayerList({ players, me, hostId, progress }: PlayerListProps) {
	return (
		<ul className="flex w-full flex-col gap-1.5" aria-label="Players">
			{players.map((p) => (
				<li
					key={p.userId}
					className={`flex flex-col gap-1 rounded-md px-2 py-1 text-sm ${p.connected ? "" : "opacity-50"}`}
				>
					<div className="flex items-center gap-2">
						<span
							aria-hidden
							className="inline-block h-3 w-3 shrink-0 rounded-full"
							style={{ backgroundColor: p.color }}
						/>
						<span className="truncate font-medium">
							{p.name}
							{p.userId === me && " (you)"}
						</span>
						{p.userId === hostId && (
							<span className="rounded bg-slate-200 px-1 text-xs dark:bg-slate-700">
								host
							</span>
						)}
						<span className="ml-auto shrink-0 text-xs text-slate-500 dark:text-slate-400">
							{p.connected ? "online" : "offline"}
							{" · "}
							{p.mistakes} {p.mistakes === 1 ? "mistake" : "mistakes"}
							{progress ? "" : ` · ${p.placements} placed`}
							{p.finished && progress ? " · ✅ finished" : ""}
						</span>
					</div>
					{progress && (
						<div
							role="progressbar"
							aria-label={`${p.name} progress`}
							aria-valuemin={0}
							aria-valuemax={progress.total}
							aria-valuenow={p.filled}
							className="h-1.5 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700"
						>
							<div
								className="h-full"
								style={{
									width: `${(100 * p.filled) / Math.max(1, progress.total)}%`,
									backgroundColor: p.color,
								}}
							/>
						</div>
					)}
				</li>
			))}
		</ul>
	);
}
