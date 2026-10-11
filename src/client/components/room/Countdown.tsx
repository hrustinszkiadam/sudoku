/**
 * Race countdown over a visible-but-locked board. The ring empties once per
 * second (driven by `msLeft`, so it keeps working under reduced motion).
 */
export function Countdown({
	msLeft,
	racers,
}: {
	msLeft: number;
	racers: number;
}) {
	const go = msLeft <= 0;
	const n = Math.ceil(msLeft / 1000);
	const left = go ? 0 : (msLeft % 1000 || 1000) / 1000;
	const r = 46;
	const len = 2 * Math.PI * r;
	return (
		<div
			role="timer"
			aria-live="assertive"
			aria-label={go ? "Go" : `Race starts in ${n}`}
			className="absolute inset-0 z-4 flex flex-col items-center justify-center gap-3.5 rounded-[10px] bg-[rgb(245_247_252/0.78)] @[420px]:rounded-[14px] dark:bg-[rgb(9_14_27/0.74)]"
		>
			<span className="text-[13px] font-extrabold tracking-[0.1em] text-ink-2 uppercase">
				{go ? "Go!" : "Race starts in"}
			</span>
			<div className="relative flex size-32 items-center justify-center rounded-full bg-surface shadow-float lg:size-46">
				<svg
					viewBox="0 0 100 100"
					aria-hidden
					className="absolute inset-0 -rotate-90"
				>
					<circle
						cx="50"
						cy="50"
						r={r}
						fill="none"
						strokeWidth="5"
						className="stroke-sunken"
					/>
					<circle
						cx="50"
						cy="50"
						r={r}
						fill="none"
						strokeWidth="5"
						strokeLinecap="round"
						strokeDasharray={len}
						strokeDashoffset={len * (1 - left)}
						className={go ? "stroke-accent" : "stroke-brand"}
					/>
				</svg>
				<span
					key={go ? "go" : n}
					className={`count-in relative font-display leading-none font-extrabold ${go ? "text-[60px] text-accent lg:text-[88px]" : "text-[84px] text-brand-strong lg:text-[120px]"}`}
				>
					{go ? "Go" : n}
				</span>
			</div>
			<span className="text-sm font-bold text-ink-2">
				Same puzzle for all {racers} racers
			</span>
		</div>
	);
}
