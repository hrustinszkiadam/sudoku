import {
	IconCheck,
	IconCrown,
	IconFlag,
	IconPlus,
	IconRotate,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import type { Difficulty, Mode, Player, Result } from "../../types";
import { formatMs } from "../Timer";
import { btn, I, PencilTile } from "../ui";
import { ordinal } from "./People";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

interface Row extends Result {
	pencil: number;
}

/** Confetti in everyone's pencils plus marigold; falls once, then rests. */
function Confetti({ pencils }: { pencils: number[] }) {
	const pieces = useMemo(() => {
		const colors = [
			...pencils.map((p) => `var(--color-p${p})`),
			"var(--color-accent)",
			"var(--color-brand)",
			"var(--color-accent)",
		];
		let seed = 7;
		const rnd = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		const out: {
			x: number;
			y: number;
			w: number;
			h: number;
			rot: number;
			color: string;
			round: boolean;
			delay: number;
		}[] = [];
		for (let n = 0; n < 120 && out.length < 40; n++) {
			const x = rnd() * 100;
			const y = rnd() * 200;
			const w = 5 + Math.round(rnd() * 7);
			const tall = rnd() > 0.5;
			const rot = Math.round(rnd() * 180);
			const color = colors[Math.floor(rnd() * colors.length)];
			const round = rnd() > 0.72;
			// Keep the pieces to the top strip and the side margins.
			if (!(y < 22 || ((x < 6 || x > 94) && y < 130))) continue;
			out.push({
				x,
				y,
				w,
				h: round ? w : tall ? Math.round(w * 2.2) : w,
				rot,
				color,
				round,
				delay: Math.round(rnd() * 300),
			});
		}
		return out;
	}, [pencils]);
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-x-0 top-0 h-[230px] motion-reduce:hidden"
		>
			{pieces.map((p, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static decoration
					key={i}
					className="confetti absolute opacity-90"
					style={{
						left: `${p.x.toFixed(1)}%`,
						top: `${p.y}px`,
						width: p.w,
						height: p.h,
						borderRadius: p.round ? 99 : 2,
						background: p.color,
						rotate: `${p.rot}deg`,
						animationDelay: `${p.delay}ms`,
					}}
				/>
			))}
		</div>
	);
}

function ResultTable({
	rows,
	me,
	race,
}: {
	rows: Row[];
	me: string;
	race: boolean;
}) {
	const score = (r: Row) =>
		r.scoreMs === null ? (race ? "DNF" : "-") : formatMs(r.scoreMs);
	return (
		<>
			{/* Narrow: one line per player */}
			<ol className="-mx-2 flex flex-col @[520px]:hidden">
				{rows.map((r) => {
					const you = r.userId === me;
					return (
						<li
							key={r.userId}
							className={`flex items-center gap-2.5 rounded-md px-2 py-2.5 ${you ? "bg-brand-soft" : "even:bg-sunken/70"}`}
						>
							{race && (
								<span className="w-4 shrink-0 font-mono text-sm font-bold">
									{r.rank ?? "-"}
								</span>
							)}
							<PencilTile pencil={r.pencil} name={r.name} size="sm" />
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="flex min-w-0 items-center gap-1.5">
									<span className="truncate text-[15px] font-bold">
										{r.name}
									</span>
									{you && (
										<span className="shrink-0 text-sm text-ink-3">(you)</span>
									)}
								</span>
								<span className="text-[13px] text-ink-2">
									{r.placements} placed, {plural(r.mistakes, "mistake")},{" "}
									{plural(r.hints, "hint")}
								</span>
							</div>
							<span
								className={`shrink-0 font-mono text-[17px] font-bold ${r.scoreMs === null ? "text-ink-3" : ""}`}
							>
								{score(r)}
							</span>
						</li>
					);
				})}
			</ol>
			{/* Wide: a real table */}
			<div className="-mx-1 hidden overflow-x-auto @[520px]:block">
				<table className="w-full border-collapse text-sm tabular">
					<thead>
						<tr className="text-left text-xs font-extrabold tracking-[0.06em] text-ink-3 uppercase">
							{race && (
								<th scope="col" className="w-7 px-1 pb-2">
									#
								</th>
							)}
							<th scope="col" className="px-1 pb-2">
								Player
							</th>
							<th scope="col" className="px-1 pb-2 text-right">
								Placed
							</th>
							<th scope="col" className="px-1 pb-2 text-right">
								Mistakes
							</th>
							<th scope="col" className="px-1 pb-2 text-right">
								Hints
							</th>
							<th scope="col" className="px-1 pb-2 text-right">
								Score
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => {
							const you = r.userId === me;
							return (
								<tr
									key={r.userId}
									className={`[&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md ${you ? "bg-brand-soft" : "even:bg-sunken/70"}`}
								>
									{race && (
										<td className="px-1 py-2.5 font-mono font-bold">
											{r.rank ?? "-"}
										</td>
									)}
									<td className="w-full max-w-0 px-1 py-2.5">
										<span className="flex min-w-0 items-center gap-2">
											<PencilTile pencil={r.pencil} name={r.name} size="sm" />
											<span className="truncate font-bold">{r.name}</span>
											{you && (
												<span className="shrink-0 text-ink-3">(you)</span>
											)}
										</span>
									</td>
									<td className="px-1 py-2.5 text-right">{r.placements}</td>
									<td className="px-1 py-2.5 text-right">{r.mistakes}</td>
									<td className="px-1 py-2.5 text-right">{r.hints}</td>
									<td
										className={`px-1 py-2.5 text-right font-mono font-bold ${r.scoreMs === null ? "text-ink-3" : ""}`}
									>
										{score(r)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}

const PODIUM_BLOCK = [
	"h-[66px] bg-[#C5CCDA] text-[#151D33] dark:bg-[#8C95AB]",
	"h-[110px] bg-accent text-[#151D33]",
	"h-12 bg-[#E6A877] text-[#151D33] dark:bg-[#C98A55]",
];

function Podium({ rows, me }: { rows: Row[]; me: string }) {
	const top = rows.filter((r) => r.rank !== null && r.rank <= 3);
	if (top.length === 0) return null;
	// Display order: 2nd, 1st, 3rd.
	const order = [top[1], top[0], top[2]];
	return (
		<div
			role="img"
			aria-label={`Podium: ${top.map((r) => `${ordinal(r.rank ?? 0)} ${r.name}, ${r.scoreMs === null ? "" : formatMs(r.scoreMs)}`).join("; ")}`}
			className="mx-auto grid w-full max-w-[420px] grid-cols-3 items-end gap-2.5"
		>
			{order.map((r, i) =>
				r ? (
					<div
						key={r.userId}
						className="flex min-w-0 flex-col items-center gap-1.5"
					>
						{r.rank === 1 && (
							<I icon={IconCrown} className="text-accent" size={22} />
						)}
						<PencilTile
							pencil={r.pencil}
							name={r.name}
							size="lg"
							className={
								r.userId === me
									? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
									: ""
							}
						/>
						<span className="max-w-full truncate text-sm font-extrabold">
							{r.name}
						</span>
						<span className="font-mono text-sm font-bold text-ink-2">
							{r.scoreMs === null ? "" : formatMs(r.scoreMs)}
						</span>
						<div
							className={`podium-rise flex w-full items-start justify-center rounded-t-md pt-2 font-display text-xl font-extrabold ${PODIUM_BLOCK[i]}`}
						>
							{r.rank}
						</div>
					</div>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: empty podium step
					<span key={i} />
				),
			)}
		</div>
	);
}

export function RoomResults({
	results,
	players,
	me,
	mode,
	difficulty,
	teamMs,
}: {
	results: readonly Result[];
	players: readonly Player[];
	me: string;
	mode: Mode;
	difficulty: Difficulty;
	/** Co-op: the board's solve time. */
	teamMs: number | null;
}) {
	const race = mode === "race";
	const heading = useRef<HTMLHeadingElement>(null);
	// Screen readers hear the result once the panel lands.
	useEffect(() => heading.current?.focus(), []);

	const rows: Row[] = results.map((r) => ({
		...r,
		pencil: players.find((p) => p.userId === r.userId)?.pencil ?? 1,
	}));
	const pencils = rows.map((r) => r.pencil);
	const again = `/?mode=${mode}&difficulty=${difficulty}`;

	let eyebrow: ReactNode;
	let title: string;
	let sub: string;
	if (race) {
		const winner = rows.find((r) => r.rank === 1);
		const mine = rows.find((r) => r.userId === me);
		eyebrow = (
			<span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-accent-soft px-3 text-[13px] font-extrabold text-warn-ink">
				<I icon={IconFlag} size={16} />
				Race over · {cap(difficulty)}
			</span>
		);
		title = !winner
			? "Race over"
			: winner.userId === me
				? "You win!"
				: `${winner.name} wins!`;
		sub = winner
			? [
					`Finished in ${formatMs(winner.finishMs ?? 0)} with ${plural(winner.mistakes, "mistake")}`,
					`score ${formatMs(winner.scoreMs ?? 0)}`,
					mine?.rank && mine.userId !== winner.userId
						? `you came ${ordinal(mine.rank)}`
						: "",
				]
					.filter(Boolean)
					.join(", ")
			: "Nobody finished this time.";
	} else {
		const mistakes = rows.reduce((n, r) => n + r.mistakes, 0);
		const hints = rows.reduce((n, r) => n + r.hints, 0);
		eyebrow = (
			<span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-success-soft px-3 text-[13px] font-extrabold text-success">
				<I icon={IconCheck} size={16} />
				Puzzle solved
			</span>
		);
		title = rows.length > 1 ? "Solved together!" : "Solved!";
		sub = [
			cap(difficulty),
			plural(rows.length, "player"),
			plural(mistakes, "mistake"),
			plural(hints, "hint"),
		].join(", ");
	}
	const placed = rows.reduce((n, r) => n + r.placements, 0);
	const contributors = [...rows]
		.sort((a, b) => b.placements - a.placements)
		.filter((r) => r.placements > 0);

	return (
		<section
			aria-labelledby="results-title"
			className="results-rise @container relative flex flex-col gap-[22px] overflow-hidden rounded-xl bg-surface px-4 py-[22px] shadow-card lg:px-8 lg:py-7"
		>
			<Confetti pencils={pencils} />
			<div className="relative flex flex-col items-center gap-2 pt-1.5 text-center">
				{eyebrow}
				<h2
					id="results-title"
					ref={heading}
					tabIndex={-1}
					className="font-display text-[38px] leading-none font-extrabold tracking-[-0.03em] text-balance outline-none lg:text-5xl"
				>
					{title}
				</h2>
				<p className="text-base leading-normal text-ink-2 text-pretty">{sub}</p>
			</div>

			{race ? (
				<Podium rows={rows} me={me} />
			) : (
				<>
					<div className="relative flex flex-col items-center gap-0.5">
						<span className="font-mono text-[52px] leading-none font-bold tabular lg:text-6xl">
							{teamMs === null ? "-" : formatMs(teamMs)}
						</span>
						<span className="text-[13px] font-extrabold tracking-[0.08em] text-ink-3 uppercase">
							Team time
						</span>
					</div>
					{contributors.length > 1 && (
						<div className="flex flex-col gap-2.5">
							<div className="flex justify-between text-sm font-bold">
								<span>Who placed what</span>
								<span className="text-ink-3">{placed} cells</span>
							</div>
							<div
								role="img"
								aria-label={`Cells placed: ${contributors.map((r) => `${r.name} ${r.placements}`).join(", ")}`}
								className="flex h-4 gap-[3px]"
							>
								{contributors.map((r) => (
									<span
										key={r.userId}
										className="block rounded-xs"
										style={{
											flex: `${r.placements} 1 0`,
											background: `var(--color-p${r.pencil})`,
										}}
									/>
								))}
							</div>
							<ul aria-hidden className="flex flex-wrap gap-x-3.5 gap-y-1.5">
								{contributors.map((r) => (
									<li
										key={r.userId}
										className="flex items-center gap-1.5 text-[13px] text-ink-2"
									>
										<span
											className="size-2.5 rounded-xs"
											style={{ background: `var(--color-p${r.pencil})` }}
										/>
										<span className="max-w-[120px] truncate">{r.name}</span>
										<strong className="text-ink">{r.placements}</strong>
									</li>
								))}
							</ul>
						</div>
					)}
				</>
			)}

			<ResultTable rows={rows} me={me} race={race} />
			<p className="relative text-[13px] leading-snug text-ink-2">
				Score = finish time + 10 s per mistake + 30 s per hint.
			</p>
			<div className="relative flex flex-wrap gap-2.5">
				<Link
					to={again}
					className={`${btn.primary} h-[52px] flex-[1_1_180px] rounded-md text-base font-extrabold`}
				>
					<I icon={IconRotate} />
					{race ? "Rematch" : "Play again"}
				</Link>
				<Link
					to="/"
					className={`${btn.secondary} h-[52px] flex-[1_1_140px] rounded-md text-base font-extrabold`}
				>
					<I icon={IconPlus} />
					New game
				</Link>
			</div>
		</section>
	);
}
