import { IconCheck, IconFlag, IconLink, IconShare2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { Difficulty } from "../../types";
import { btn, I, SwapLabel } from "../ui";
import { modeLabel } from "./RoomBar";
import { canShare, inviteUrl, shareInvite, useCopy } from "./share";

const RULES = [
	{
		title: "Same puzzle, your own board",
		text: "Everyone starts together after a 3-second countdown.",
	},
	{
		title: "Progress, never digits",
		text: "You see how far each racer is, not what they wrote.",
	},
	{
		title: "Lowest score wins",
		text: "Finish time + 10 s per mistake + 30 s per hint.",
	},
];

export function Lobby({
	code,
	difficulty,
	connected,
	isHost,
	onStart,
}: {
	code: string;
	difficulty: Difficulty;
	connected: number;
	isHost: boolean;
	onStart: () => void;
}) {
	const { copied, copy } = useCopy<"link">();
	const [share, setShare] = useState(false);
	useEffect(() => setShare(canShare()), []);
	const ready = connected >= 2;

	return (
		<section
			aria-labelledby="lobby-title"
			className="flex min-w-0 flex-col gap-[22px] rounded-xl bg-surface px-[18px] py-[22px] shadow-card lg:min-h-[556px] lg:gap-7 lg:px-10 lg:py-9"
		>
			<div className="flex flex-col gap-2.5">
				<span className="inline-flex h-[30px] items-center gap-2 self-start rounded-full bg-brand-soft px-3 text-[13px] font-extrabold text-brand-strong">
					<I icon={IconFlag} size={16} />
					{modeLabel("race", difficulty)}
				</span>
				<h1
					id="lobby-title"
					className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.025em] lg:text-5xl"
				>
					Race lobby
				</h1>
				<p className="text-[17px] leading-normal text-ink-2">
					Share the invite link.{" "}
					<strong className="text-ink">
						{connected} player{connected === 1 ? "" : "s"}
					</strong>{" "}
					here.
				</p>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-sunken p-3.5 lg:px-5 lg:py-[18px]">
				<p
					role="img"
					aria-label={`Room code ${code.split("").join(" ")}`}
					translate="no"
					className="flex gap-[5px] lg:gap-2"
				>
					{code.split("").map((ch, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: characters repeat
							key={i}
							className="flex h-12 w-10 items-center justify-center rounded-md bg-surface font-mono text-2xl font-bold shadow-card lg:h-16 lg:w-12 lg:text-[32px]"
						>
							{ch}
						</span>
					))}
				</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => copy(inviteUrl(code), "link")}
						className={`${btn.primary} ${btn.md} px-4 text-[15px]`}
					>
						<SwapLabel
							on={copied !== null}
							idle={
								<>
									<I icon={IconLink} />
									Copy invite link
								</>
							}
							done={
								<>
									<I icon={IconCheck} />
									Copied
								</>
							}
						/>
					</button>
					{share && (
						<button
							type="button"
							onClick={() => shareInvite(code)}
							className={`${btn.secondary} ${btn.md} px-4 text-[15px]`}
						>
							<I icon={IconShare2} />
							Share…
						</button>
					)}
				</div>
			</div>

			<ol className="grid gap-4 lg:grid-cols-3">
				{RULES.map((r, i) => (
					<li key={r.title} className="flex items-start gap-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-softer font-mono text-[15px] font-bold text-brand-strong">
							{i + 1}
						</span>
						<div className="flex flex-col gap-[3px]">
							<span className="text-[15px] font-bold">{r.title}</span>
							<span className="text-sm leading-snug text-ink-2">{r.text}</span>
						</div>
					</li>
				))}
			</ol>

			<div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
				{isHost ? (
					<>
						<button
							type="button"
							onClick={onStart}
							disabled={!ready}
							className={`${btn.primary} ${btn.lg} px-7 text-lg`}
						>
							<I icon={IconFlag} />
							Start race
						</button>
						<span className="text-sm text-ink-2">
							{ready
								? "Everyone here gets a 3-second countdown"
								: "At least 2 players are needed."}
						</span>
					</>
				) : (
					<p
						role="status"
						className="flex h-14 items-center gap-3 rounded-lg bg-sunken px-[18px] text-base font-bold text-ink-2"
					>
						<span aria-hidden className="flex gap-1">
							<span className="size-[7px] rounded-full bg-brand" />
							<span className="size-[7px] rounded-full bg-brand opacity-60" />
							<span className="size-[7px] rounded-full bg-brand opacity-30" />
						</span>
						Waiting for the host to start…
					</p>
				)}
			</div>
		</section>
	);
}
