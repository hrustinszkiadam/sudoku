import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { usePageMeta } from "../meta";
import { api, type Daily as DailyData } from "../net/api";
import { useSession } from "../store/session";

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

	return (
		<main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
			<h1 className="text-2xl font-bold">Daily puzzle</h1>
			{error && (
				<p role="alert" className="text-red-600">
					{error}
				</p>
			)}
			{!daily && !error && <p className="text-slate-500">Loading…</p>}
			{daily && (
				<>
					<p className="text-slate-600 dark:text-slate-300">
						{new Date(`${daily.date}T00:00:00Z`).toLocaleDateString(undefined, {
							dateStyle: "full",
							timeZone: "UTC",
						})}{" "}
						· <span className="capitalize">{daily.difficulty}</span>. Everyone
						gets the same puzzle; it changes at midnight UTC.
					</p>
					<Link
						to={`/r/${daily.code}`}
						className="self-start rounded-md bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700"
					>
						Play today's puzzle
					</Link>
					<section className="flex flex-col gap-2">
						<h2 className="font-semibold">Today's best times</h2>
						<LeaderboardTable
							rows={daily.leaderboard}
							me={session?.userId}
							caption="Today's best times"
						/>
					</section>
				</>
			)}
		</main>
	);
}
