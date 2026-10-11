import { IconCheck, IconFlag, IconPlayerStop } from "@tabler/icons-react";
import { useState } from "react";
import type { Player } from "../../types";
import { formatMs } from "../Timer";
import { btn, I, initialOf, PencilTile, pencilStyle } from "../ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function HostBadge() {
	return (
		<span className="inline-flex h-[18px] shrink-0 items-center rounded-xs bg-brand-soft px-1.5 text-[11px] font-extrabold tracking-[0.04em] text-brand-strong uppercase">
			Host
		</span>
	);
}

function Name({
	player,
	me,
	host,
}: {
	player: Player;
	me: string;
	host: string;
}) {
	return (
		<span className="flex min-w-0 items-center gap-1.5">
			<span className="min-w-0 truncate text-[15px] font-bold">
				{player.name}
			</span>
			{player.userId === me && (
				<span className="shrink-0 text-sm text-ink-3">(you)</span>
			)}
			{player.userId === host && <HostBadge />}
		</span>
	);
}

function CardHead({ title, aside }: { title: string; aside: string }) {
	return (
		<div className="mb-1 flex items-baseline justify-between gap-2">
			<h2 className="text-base font-extrabold">{title}</h2>
			<span className="text-[13px] font-bold text-ink-3">{aside}</span>
		</div>
	);
}

/** Co-op players (and the race lobby): tile with online dot, name, one line of stats. */
export function PlayersCard({
	players,
	me,
	hostId,
	lobby = false,
}: {
	players: readonly Player[];
	me: string;
	hostId: string;
	lobby?: boolean;
}) {
	return (
		<section className="rounded-lg bg-surface px-[18px] pt-4 pb-2 shadow-card">
			<CardHead title="Players" aside={`${players.length} / 8`} />
			<ul aria-label="Players">
				{players.map((p) => {
					const meta = lobby
						? p.connected
							? p.userId === hostId
								? "Starts the race"
								: "Ready"
							: "Offline"
						: `${p.connected ? "" : "Offline, "}${p.placements} placed, ${plural(p.mistakes, "mistake")}`;
					return (
						<li
							key={p.userId}
							className={`flex items-center gap-3 border-t border-hair py-[9px] ${p.connected ? "" : "opacity-55"}`}
						>
							<span className="relative">
								<PencilTile pencil={p.pencil} name={p.name} />
								<span
									className={`absolute -right-[3px] -bottom-[3px] size-2.5 rounded-full border-2 border-surface ${p.connected ? "bg-success" : "bg-ink-3"}`}
								/>
							</span>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<Name player={p} me={me} host={hostId} />
								<span className="truncate text-[13px] text-ink-2">
									{p.connected && <span className="sr-only">Online, </span>}
									{meta}
								</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Finished first (fastest first), then by cells filled. */
export function raceOrder(players: readonly Player[]): Player[] {
	return [...players].sort((a, b) => {
		if (a.finished !== b.finished) return a.finished ? -1 : 1;
		if (a.finished && b.finished) return (a.finishMs ?? 0) - (b.finishMs ?? 0);
		return b.filled - a.filled;
	});
}

const ordinal = (n: number) =>
	`${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

export { ordinal };

/** Race lanes: progress bars only, never digits. */
export function RaceLanes({
	players,
	me,
	hostId,
	total,
	onEnd,
}: {
	players: readonly Player[];
	me: string;
	hostId: string;
	total: number;
	/** Host only, while racing. */
	onEnd?: () => void;
}) {
	const lanes = raceOrder(players);
	const myPlace = lanes.findIndex((p) => p.userId === me) + 1;
	return (
		<section className="flex flex-col rounded-lg bg-surface px-[18px] pt-4 pb-3.5 shadow-card">
			<div className="mb-1.5 flex items-baseline justify-between gap-2">
				<h2 className="text-base font-extrabold">Race</h2>
				{myPlace > 0 && (
					<span className="text-[13px] font-extrabold text-brand-strong">
						You're {ordinal(myPlace)} of {lanes.length}
					</span>
				)}
			</div>
			<ul aria-label="Players">
				{lanes.map((p) => {
					const you = p.userId === me;
					const pct = Math.min(100, (100 * p.filled) / Math.max(1, total));
					return (
						<li
							key={p.userId}
							style={pencilStyle(p.pencil)}
							className={`flex flex-col gap-[7px] rounded-md py-2.5 ${you ? "-mx-2.5 bg-brand-softer px-2.5" : "border-t border-hair"} ${p.connected ? "" : "opacity-55"}`}
						>
							<div className="flex min-w-0 items-center gap-2.5">
								<PencilTile pencil={p.pencil} name={p.name} size="sm" />
								<Name player={p} me={me} host={hostId} />
								<span
									className={`ml-auto flex shrink-0 items-center gap-1 font-mono text-[13px] font-bold ${p.finished ? "text-success" : "text-ink-2"}`}
								>
									{p.finished ? (
										<>
											<I icon={IconCheck} size={16} className="check-pop" />
											Finished
											{p.finishMs !== null && ` ${formatMs(p.finishMs)}`}
										</>
									) : (
										`${p.connected ? "" : "offline, "}${p.filled} / ${total}`
									)}
								</span>
							</div>
							<div
								role="progressbar"
								aria-label={`${p.name}: ${p.filled} of ${total} cells`}
								aria-valuemin={0}
								aria-valuemax={total}
								aria-valuenow={p.filled}
								className="h-2 overflow-hidden rounded-full bg-sunken"
							>
								<span
									className="block h-full rounded-full bg-(--pc) transition-[width] duration-400 ease-standard"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</li>
					);
				})}
			</ul>
			{onEnd && <EndRace onEnd={onEnd} />}
		</section>
	);
}

/** Ending the race is for everyone, so it asks once before it happens. */
function EndRace({ onEnd }: { onEnd: () => void }) {
	const [asking, setAsking] = useState(false);
	const base = "mt-2.5 h-11 rounded-md text-[15px] font-extrabold";
	if (!asking) {
		return (
			<button
				type="button"
				onClick={() => setAsking(true)}
				className={`${btn.danger} ${base} border-[1.5px]`}
			>
				<I icon={IconPlayerStop} />
				End race now
			</button>
		);
	}
	return (
		<fieldset className="mt-2.5 flex flex-col gap-2">
			<legend className="mb-2 text-sm font-bold">
				End the race for everyone? Unfinished players get no rank.
			</legend>
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => setAsking(false)}
					className={`${btn.secondary} ${base}`}
				>
					Keep racing
				</button>
				<button
					type="button"
					onClick={onEnd}
					className={`${base} inline-flex items-center justify-center bg-danger text-on-brand hover:opacity-90 active:translate-y-px`}
				>
					End race
				</button>
			</div>
		</fieldset>
	);
}

/** Phone: everyone's progress on one line above the board. */
export function RaceTrack({
	players,
	me,
	total,
}: {
	players: readonly Player[];
	me: string;
	total: number;
}) {
	const mine = players.find((p) => p.userId === me);
	const frac = (p: Player) => Math.min(1, p.filled / Math.max(1, total));
	// Spread overlapping marks so every initial stays readable.
	let last = Number.NEGATIVE_INFINITY;
	const marks = [...players]
		.sort((a, b) => a.filled - b.filled)
		.map((p) => {
			const at = Math.max(frac(p) * 100, last + 6);
			last = at;
			return { p, at };
		});
	return (
		<div
			role="img"
			aria-label={`Race progress: ${players.map((p) => `${p.name} ${p.filled} of ${total}`).join(", ")}`}
			className="relative mb-2.5 h-10 lg:hidden"
		>
			<span className="absolute top-[19px] right-[26px] left-0 h-[3px] rounded-full bg-hair" />
			<span
				className="absolute top-[19px] left-0 h-[3px] rounded-full bg-brand transition-[width] duration-400 ease-standard"
				style={{
					width: `calc((100% - 48px) * ${mine ? frac(mine) : 0} + 10px)`,
				}}
			/>
			<I icon={IconFlag} className="absolute top-2.5 right-0 text-ink-2" />
			{marks.map(({ p, at }) => (
				<span
					key={p.userId}
					style={{
						...pencilStyle(p.pencil),
						left: `calc((100% - 48px) * ${Math.min(at, 100) / 100})`,
					}}
					className={`absolute top-2.5 flex size-5 items-center justify-center rounded-xs bg-(--pc) text-[11px] font-extrabold text-(--pc-on) transition-[left] duration-400 ease-standard ${p.userId === me ? "shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-brand)]" : "shadow-[0_0_0_2px_var(--color-bg)]"} ${p.connected ? "" : "opacity-55"}`}
				>
					{initialOf(p.name)}
				</span>
			))}
		</div>
	);
}
