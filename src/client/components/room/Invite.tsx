import { IconCheck, IconLink, IconShare2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { Difficulty, Mode } from "../../types";
import { Sheet } from "../Sheet";
import { btn, I, Overline, SwapLabel } from "../ui";
import { modeLabel } from "./RoomBar";
import { canShare, inviteUrl, shareInvite, useCopy } from "./share";

/** Desktop side card while you're alone in a room. */
export function InviteCard({ code }: { code: string }) {
	const { copied, copy } = useCopy<"link">();
	const [share, setShare] = useState(false);
	useEffect(() => setShare(canShare()), []);
	const url = inviteUrl(code);
	return (
		<section
			aria-label="Invite friends"
			className="flex flex-col gap-3 rounded-lg bg-brand p-5 text-on-brand shadow-card"
		>
			<Overline className="text-on-brand/80">Invite friends</Overline>
			<p className="font-display text-[26px] leading-[1.08] font-extrabold tracking-[-0.02em]">
				You're the only one here
			</p>
			<p className="text-[15px] leading-snug opacity-90">
				Send the link. Friends join straight into this board, no sign-up.
			</p>
			<span className="block truncate rounded-md bg-white/16 px-3 py-2.5 font-mono text-[11px] font-bold">
				{url.replace(/^https?:\/\//, "")}
			</span>
			<div className={`grid gap-2 ${share ? "grid-cols-2" : "grid-cols-1"}`}>
				<button
					type="button"
					onClick={() => copy(url, "link")}
					className="flex h-11 items-center justify-center gap-2 rounded-md bg-white text-[15px] font-extrabold text-[#2841B9] active:translate-y-px"
				>
					<SwapLabel
						on={copied !== null}
						idle={
							<>
								<I icon={IconLink} />
								Copy link
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
						className="flex h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-white/70 text-[15px] font-extrabold hover:bg-white/10 active:translate-y-px"
					>
						<I icon={IconShare2} />
						Share…
					</button>
				)}
			</div>
		</section>
	);
}

/** Phone invite moment: the code, Web Share with a copy fallback. */
export function InviteSheet({
	open,
	onClose,
	code,
	mode,
	difficulty,
}: {
	open: boolean;
	onClose: () => void;
	code: string;
	mode: Mode;
	difficulty: Difficulty;
}) {
	const { copied, copy } = useCopy<"link">();
	const [share, setShare] = useState(false);
	useEffect(() => setShare(canShare()), []);
	return (
		<Sheet open={open} onClose={onClose} title="Invite friends">
			<p className="-mt-2 text-[15px] leading-normal text-ink-2">
				Share the link. Friends join this board instantly, no sign-up needed.
			</p>
			<div className="flex items-center justify-between gap-3 rounded-lg bg-sunken px-4 py-3.5">
				<div className="flex min-w-0 flex-col gap-0.5">
					<Overline>Room code</Overline>
					<span
						translate="no"
						className="font-mono text-[30px] leading-[1.1] font-bold tracking-[0.14em]"
					>
						{code}
					</span>
				</div>
				<span className="text-right text-[13px] leading-snug text-ink-2">
					{modeLabel(mode, difficulty).split(" · ").reverse().join(" · ")}
					<br />
					up to 8 players
				</span>
			</div>
			{share && (
				<button
					type="button"
					onClick={() => shareInvite(code)}
					className={`${btn.primary} ${btn.lg}`}
				>
					<I icon={IconShare2} />
					Share invite link
				</button>
			)}
			<button
				type="button"
				onClick={() => copy(inviteUrl(code), "link")}
				className={`${share ? btn.secondary : btn.primary} ${btn.lg}`}
			>
				<SwapLabel
					on={copied !== null}
					idle={
						<>
							<I icon={IconLink} />
							Copy link
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
			<button
				type="button"
				onClick={onClose}
				className="h-11 self-center px-4 text-[15px] font-extrabold text-brand-strong"
			>
				Start solving on my own
			</button>
		</Sheet>
	);
}
