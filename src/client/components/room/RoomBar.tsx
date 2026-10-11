import {
	IconCheck,
	IconCopy,
	IconFlag,
	IconHelpCircle,
	IconLink,
	IconLogout2,
	IconShare2,
	IconUsers,
} from "@tabler/icons-react";
import { Link } from "react-router";
import type { Difficulty, Mode } from "../../types";
import { btn, I, Overline } from "../ui";
import { inviteUrl, useCopy } from "./share";

export const modeLabel = (mode: Mode, difficulty: Difficulty) =>
	`${mode === "race" ? "Race" : "Co-op"} · ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`;

export function ModeChip({
	mode,
	difficulty,
	className = "",
}: {
	mode: Mode;
	difficulty: Difficulty;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex h-7 shrink-0 items-center gap-2 rounded-full bg-sunken px-2.5 text-[13px] font-bold whitespace-nowrap md:h-8 md:px-3 md:text-sm ${className}`}
		>
			<I
				icon={mode === "race" ? IconFlag : IconUsers}
				size={16}
				className="hidden md:block"
			/>
			{modeLabel(mode, difficulty)}
		</span>
	);
}

/** Code (tap to copy just the code), mode, invite and the room's exits. */
export function RoomBar({
	code,
	mode,
	difficulty,
	onInvite,
	onHelp,
}: {
	code: string;
	mode: Mode;
	difficulty: Difficulty;
	onInvite: () => void;
	onHelp: () => void;
}) {
	const { copied, copy } = useCopy<"code" | "link">();
	return (
		<div className="mt-3 mb-2.5 flex items-center justify-between gap-2 md:mt-6 md:mb-5 md:gap-4">
			<div className="flex min-w-0 items-center gap-2 md:gap-4">
				<div className="flex flex-col gap-0.5">
					<Overline className="hidden md:block">Room</Overline>
					<button
						type="button"
						onClick={() => copy(code, "code")}
						aria-label={copied === "code" ? "Copied" : "Copy code"}
						title="Copy the room code"
						className="group flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface pr-2.5 pl-3 hover:bg-sunken md:-ml-1 md:h-auto md:gap-2 md:border-0 md:bg-transparent md:px-1 md:hover:bg-transparent"
					>
						<span className="font-mono text-[17px] leading-[1.1] font-bold tracking-[0.1em] md:text-[28px] md:tracking-[0.12em]">
							{code}
						</span>
						<I
							icon={copied === "code" ? IconCheck : IconCopy}
							size={18}
							className={
								copied === "code"
									? "text-success"
									: "text-ink-2 md:text-ink-3 md:group-hover:text-ink"
							}
						/>
					</button>
				</div>
				<span className="hidden md:block">
					<button
						type="button"
						onClick={() => copy(inviteUrl(code), "link")}
						className={`${btn.sm} w-full ${
							copied === "link"
								? "border border-success bg-success-soft text-success"
								: btn.secondary
						}`}
					>
						<I icon={copied === "link" ? IconCheck : IconLink} />
						{copied === "link" ? "Copied" : "Copy invite link"}
					</button>
				</span>
				<ModeChip mode={mode} difficulty={difficulty} />
			</div>
			<button
				type="button"
				onClick={onInvite}
				className={`${btn.secondary} ${btn.sm} shrink-0 px-3 md:hidden`}
			>
				<I icon={IconShare2} />
				Invite
			</button>
			<div className="hidden shrink-0 items-center gap-1 md:flex">
				<RoomExits onHelp={onHelp} />
			</div>
		</div>
	);
}

export function RoomExits({ onHelp }: { onHelp: () => void }) {
	return (
		<>
			<button
				type="button"
				onClick={onHelp}
				className={`${btn.ghost} ${btn.sm} px-3`}
			>
				<I icon={IconHelpCircle} />
				How to play
			</button>
			<Link to="/" className={`${btn.ghost} ${btn.sm} px-3`}>
				<I icon={IconLogout2} />
				Leave room
			</Link>
		</>
	);
}
