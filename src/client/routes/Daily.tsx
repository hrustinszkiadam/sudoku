import { IconTable } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { Loading, StatePanel } from "../components/States";
import { btn, I } from "../components/ui";
import { usePageMeta } from "../meta";
import { api, type Daily as DailyData } from "../net/api";
import { useSession } from "../store/session";

/** Today's date as a calendar tile, the one place marigold leads. */
function DateTile({ date }: { date: Date }) {
	const fmt = (o: Intl.DateTimeFormatOptions) =>
		date.toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
	return (
		<div
			aria-hidden
			className="flex w-24 flex-col items-center rounded-[22px] bg-accent pt-3 pb-2 text-[#151D33] shadow-[0_6px_0_0_#D8901A] lg:w-28"
		>
			<span className="text-xs font-extrabold tracking-[0.08em] uppercase">
				{fmt({ weekday: "short" })} · {fmt({ month: "short" })}
			</span>
			<span className="font-display text-5xl leading-none font-extrabold lg:text-[56px]">
				{fmt({ day: "numeric" })}
			</span>
		</div>
	);
}

export function Daily() {
	usePageMeta({
		title: "Daily puzzle",
		description:
			"Today's free daily sudoku: one medium puzzle for everyone, new every day at midnight UTC. Compare your time on the daily leaderboard.",
		path: "/daily",
	});
	const session = useSession((s) => s.session);
	const [daily, setDaily] = useState<DailyData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!session) return;
		api
			.daily()
			.then(setDaily)
			.catch((e: unknown) =>
				setError(
					e instanceof Error ? e.message : "Could not load the daily puzzle",
				),
			);
	}, [session]);

	if (error) {
		return (
			<StatePanel mood="error" title="Couldn't load the daily puzzle">
				<span role="alert">{error}</span>
			</StatePanel>
		);
	}
	if (!daily) return <Loading />;

	const date = new Date(`${daily.date}T00:00:00Z`);
	const long = date.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
	const players = daily.leaderboard.length;
	return (
		<main className="mx-auto grid w-full grid-cols-1 max-w-[1280px] items-start gap-8 px-4 pt-7 pb-12 md:px-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-24 lg:pt-16 xl:px-12">
			<div className="flex flex-col gap-4">
				<DateTile date={date} />
				<h1 className="mt-3 font-display text-[44px] leading-none font-extrabold tracking-[-0.035em] lg:text-[64px]">
					Daily puzzle
				</h1>
				<p className="text-lg font-bold">
					{long} · <span className="capitalize">{daily.difficulty}</span>
				</p>
				<p className="text-[17px] leading-relaxed text-ink-2">
					Everyone gets the same puzzle; it changes at midnight UTC.
				</p>
				<Link
					to={`/r/${daily.code}`}
					className={`${btn.primary} ${btn.lg} mt-2 lg:self-start`}
				>
					<I icon={IconTable} />
					Play today's puzzle
				</Link>
				<p className="text-[13px] text-ink-2">
					Opens a solo room. Your best time counts; replays are fine.
				</p>
			</div>
			<section className="rounded-xl bg-surface px-4 py-5 shadow-card sm:px-7 sm:py-7">
				<div className="mb-4 flex items-baseline justify-between gap-3">
					<h2 className="font-display text-2xl font-extrabold tracking-[-0.01em] lg:text-[26px]">
						Today's best times
					</h2>
					<span className="shrink-0 text-[13px] text-ink-2">
						{players} player{players === 1 ? "" : "s"} today
					</span>
				</div>
				<LeaderboardTable
					rows={daily.leaderboard}
					me={session?.userId}
					caption="Today's best times"
					empty="Be the first name on today's board."
				/>
			</section>
		</main>
	);
}
