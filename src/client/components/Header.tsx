import {
	IconCalendar,
	IconChartBar,
	IconChevronDown,
	IconVolume,
	IconVolume3,
} from "@tabler/icons-react";
import { Link, NavLink } from "react-router";
import { useSound } from "../sound";
import { useSession } from "../store/session";
import { InstallButton } from "./InstallButton";
import { ProfileMenu } from "./ProfileMenu";
import { I, initialOf, Logo, pencilFor, pencilStyle } from "./ui";

const iconBtn =
	"flex size-10 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink";

const navLink = ({ isActive }: { isActive: boolean }) =>
	`flex h-10 items-center justify-center gap-2 rounded-md text-[15px] font-bold w-10 md:w-auto md:px-3.5 ${
		isActive
			? "bg-sunken text-ink"
			: "text-ink-2 hover:bg-sunken hover:text-ink"
	}`;

function SoundToggle() {
	const enabled = useSound((s) => s.enabled);
	const toggle = useSound((s) => s.toggle);
	return (
		<button
			type="button"
			onClick={toggle}
			aria-pressed={enabled}
			aria-label="Sound"
			title={enabled ? "Sound on" : "Sound off"}
			className={iconBtn}
		>
			<I icon={enabled ? IconVolume : IconVolume3} />
		</button>
	);
}

export function Header() {
	const session = useSession((s) => s.session);
	const pencil = session ? pencilFor(session.userId) : 2;
	return (
		<header className="border-b border-hair bg-surface">
			<div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-2 pr-2 pl-4 md:h-16 md:gap-4 md:px-12">
				<div className="flex min-w-0 items-center gap-7">
					<Link
						to="/"
						aria-label="Sudoku home"
						className="flex shrink-0 items-center gap-2 rounded-md md:gap-2.5"
					>
						<Logo />
						<span
							translate="no"
							className="font-display text-xl font-extrabold tracking-[-0.03em] md:text-[23px]"
						>
							Sudoku
						</span>
					</Link>
					<nav aria-label="Main" className="hidden items-center gap-1 md:flex">
						<NavLink to="/daily" className={navLink}>
							<I icon={IconCalendar} />
							Daily
						</NavLink>
						<NavLink to="/leaderboard" className={navLink}>
							<I icon={IconChartBar} />
							Leaderboard
						</NavLink>
					</nav>
				</div>
				<div className="flex shrink-0 items-center md:gap-2">
					<nav aria-label="Main" className="flex items-center md:hidden">
						<NavLink to="/daily" aria-label="Daily puzzle" className={navLink}>
							<I icon={IconCalendar} />
						</NavLink>
						<NavLink
							to="/leaderboard"
							aria-label="Leaderboard"
							className={navLink}
						>
							<I icon={IconChartBar} />
						</NavLink>
					</nav>
					<InstallButton />
					<SoundToggle />
					{session && (
						<>
							<button
								type="button"
								popoverTarget="profile-menu"
								aria-label={`${session.name}, profile and settings`}
								style={pencilStyle(pencil)}
								className="flex h-10 w-11 items-center justify-center md:w-auto md:max-w-[220px] md:gap-2.5 md:rounded-full md:border md:border-hair md:bg-surface md:pr-2.5 md:pl-1 md:hover:bg-sunken"
							>
								<span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--pc) text-sm font-extrabold text-(--pc-on) shadow-[0_0_0_2px_var(--color-surface),0_0_0_3px_var(--color-hair)] md:shadow-none">
									{initialOf(session.name)}
								</span>
								<span className="hidden min-w-0 truncate text-[15px] font-bold md:block">
									{session.name}
								</span>
								<I
									icon={IconChevronDown}
									size={16}
									className="hidden shrink-0 text-ink-3 md:block"
								/>
							</button>
							<ProfileMenu />
						</>
					)}
				</div>
			</div>
		</header>
	);
}
