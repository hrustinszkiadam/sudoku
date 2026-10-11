import {
	IconAlertTriangle,
	IconCheck,
	IconFlag,
	IconPlus,
	IconUsers,
} from "@tabler/icons-react";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { DIFFICULTIES, MODES, ROOM_CODE_LENGTH } from "../../shared/constants";
import {
	SignInButtons,
	SignOutButton,
	useAuthProviders,
} from "../components/Account";
import { History } from "../components/History";
import { field, NicknameForm } from "../components/ProfileMenu";
import { SegmentedRadio } from "../components/Segmented";
import { Turnstile } from "../components/Turnstile";
import { btn, I, initialOf, pencilFor, pencilStyle } from "../components/ui";
import { usePageMeta } from "../meta";
import { ApiError, api } from "../net/api";
import { useSession } from "../store/session";
import type { Difficulty, Mode } from "../types";

const MODE_INFO: Record<Mode, { label: string; short: string }> = {
	coop: { label: "Co-op", short: "One board, solved together" },
	race: { label: "Race", short: "Same puzzle, fastest score wins" },
};

const STEPS = [
	{ title: "Create a room", text: "Pick Co-op or Race and a difficulty." },
	{
		title: "Share the link",
		text: "Friends join instantly from any phone or laptop.",
	},
	{
		title: "Play",
		text: "Tap a cell, then a number. Turn on Notes for pencil marks.",
	},
];

const isMode = (v: string | null): v is Mode => MODES.includes(v as Mode);
const isDifficulty = (v: string | null): v is Difficulty =>
	DIFFICULTIES.includes(v as Difficulty);

function Steps() {
	return (
		<ol className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
			{STEPS.map((s, i) => (
				<li
					key={s.title}
					className="flex flex-col gap-1 border-t-2 border-line pt-3"
				>
					<span className="font-mono text-sm font-bold text-brand-strong">
						{i + 1}
					</span>
					<span className="text-base font-bold">{s.title}</span>
					<span className="text-[15px] leading-snug text-ink-2">{s.text}</span>
				</li>
			))}
		</ol>
	);
}

function AppearAs() {
	const session = useSession((s) => s.session);
	const [editing, setEditing] = useState(false);
	if (!session) return <div className="h-10" />;
	if (editing) {
		return (
			<div className="max-w-sm">
				<NicknameForm autoFocus onSaved={() => setEditing(false)} />
			</div>
		);
	}
	return (
		<p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-ink-2">
			You'll appear as
			<span
				style={pencilStyle(pencilFor(session.userId))}
				className="inline-flex h-10 max-w-[220px] items-center gap-2.5 rounded-full border border-hair bg-surface pr-3.5 pl-1 text-ink"
			>
				<span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--pc) text-sm font-extrabold text-(--pc-on)">
					{initialOf(session.name)}
				</span>
				<span className="truncate text-[15px] font-bold">{session.name}</span>
			</span>
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="font-extrabold text-brand-strong underline underline-offset-2"
			>
				Change
			</button>
		</p>
	);
}

function ModeCards({
	mode,
	onChange,
}: {
	mode: Mode;
	onChange: (m: Mode) => void;
}) {
	return (
		<fieldset className="flex flex-col">
			<legend className="mb-2 text-xs font-extrabold tracking-[0.08em] text-ink-3 uppercase">
				Mode
			</legend>
			<div className="grid grid-cols-2 gap-3">
				{MODES.map((m) => {
					const on = mode === m;
					return (
						<label
							key={m}
							className={`relative flex cursor-pointer flex-col gap-1 rounded-lg border p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${
								on
									? "border-2 border-brand bg-brand-softer p-[15px]"
									: "border-line bg-surface hover:bg-sunken"
							}`}
						>
							<input
								type="radio"
								name="mode"
								value={m}
								className="sr-only"
								checked={on}
								onChange={() => onChange(m)}
							/>
							<I
								icon={m === "coop" ? IconUsers : IconFlag}
								size={22}
								className={on ? "text-brand" : "text-ink-2"}
							/>
							<span className="mt-1 text-[17px] font-bold">
								{MODE_INFO[m].label}
							</span>
							<span className="text-sm leading-snug text-ink-2">
								{MODE_INFO[m].short}
							</span>
							{on && (
								<span className="absolute top-2.5 right-2.5 flex size-[22px] items-center justify-center rounded-full bg-brand text-on-brand">
									<I icon={IconCheck} size={14} stroke={3} />
								</span>
							)}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function NewGame() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const [mode, setMode] = useState<Mode>(() => {
		const m = params.get("mode");
		return isMode(m) ? m : "coop";
	});
	const [difficulty, setDifficulty] = useState<Difficulty>(() => {
		const d = params.get("difficulty");
		return isDifficulty(d) ? d : "easy";
	});
	const [siteKey, setSiteKey] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [resetKey, setResetKey] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [codeError, setCodeError] = useState(false);

	useEffect(() => {
		api
			.config()
			.then((c) => setSiteKey(c.turnstileSiteKey))
			.catch(() => setError("Could not load the page configuration"));
	}, []);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		if (!token) return;
		setBusy(true);
		setError(null);
		try {
			const { code } = await api.createRoom({
				mode,
				difficulty,
				turnstileToken: token,
			});
			navigate(`/r/${code}`);
		} catch (err) {
			setError(
				err instanceof ApiError
					? err.message
					: "Couldn't create the room. Check your connection and try again.",
			);
			setResetKey((k) => k + 1);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section
			id="new-game"
			aria-labelledby="new-game-title"
			className="enter flex scroll-mt-6 flex-col gap-5 rounded-xl bg-surface p-4 shadow-float sm:p-7"
			style={{ "--i": 3 } as CSSProperties}
		>
			<h2
				id="new-game-title"
				className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.01em] sm:text-[28px]"
			>
				New game
			</h2>
			<form className="flex flex-col gap-5" onSubmit={submit}>
				<ModeCards mode={mode} onChange={setMode} />
				<SegmentedRadio
					name="difficulty"
					label="Difficulty"
					options={DIFFICULTIES}
					value={difficulty}
					onChange={setDifficulty}
				/>
				<div className="flex min-h-[65px] items-center">
					{siteKey && (
						<Turnstile
							siteKey={siteKey}
							onToken={setToken}
							resetKey={resetKey}
						/>
					)}
				</div>
				<div className="flex flex-col gap-2.5">
					<button
						type="submit"
						className={`${btn.primary} ${btn.lg} w-full`}
						disabled={!token || busy}
					>
						{busy ? (
							<span
								aria-hidden
								className="spin-slow size-5 rounded-full border-2 border-current border-r-transparent"
							/>
						) : (
							<I icon={IconPlus} />
						)}
						{busy ? "Creating…" : "Create room"}
					</button>
					{error && (
						<p
							role="alert"
							className="flex items-center justify-center gap-1.5 text-center text-sm font-bold text-danger"
						>
							<I icon={IconAlertTriangle} size={16} />
							{error}
						</p>
					)}
				</div>
			</form>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					if (code.length === ROOM_CODE_LENGTH) navigate(`/r/${code}`);
					else {
						setCodeError(true);
						document.getElementById("room-code")?.focus();
					}
				}}
			>
				<div className="flex items-center gap-3">
					<span className="h-px flex-1 bg-hair" />
					<label htmlFor="room-code" className="text-sm font-bold text-ink-2">
						Have a room code?
					</label>
					<span className="h-px flex-1 bg-hair" />
				</div>
				<div className="flex gap-2">
					<input
						id="room-code"
						name="code"
						translate="no"
						aria-invalid={codeError}
						aria-describedby={codeError ? "room-code-error" : undefined}
						className={`${field} h-[52px] min-w-0 flex-1 font-mono text-[22px] font-bold tracking-[0.3em] uppercase placeholder:font-bold placeholder:text-ink-3/60`}
						placeholder="K7QM4R"
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						value={code}
						maxLength={ROOM_CODE_LENGTH}
						onChange={(e) => {
							setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
							setCodeError(false);
						}}
					/>
					<button
						type="submit"
						className={`${btn.secondary} h-[52px] rounded-md px-6 text-base`}
					>
						Join
					</button>
				</div>
				{codeError && (
					<p
						id="room-code-error"
						role="alert"
						className="flex items-center gap-1.5 text-sm font-bold text-danger"
					>
						<I icon={IconAlertTriangle} size={16} />
						Room codes have {ROOM_CODE_LENGTH} letters and digits.
					</p>
				)}
			</form>
		</section>
	);
}

function AccountCard() {
	const session = useSession((s) => s.session);
	const providers = useAuthProviders();
	if (!session?.account && providers.length === 0) return null;
	return (
		<section className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-6">
			<h2 className="text-lg font-extrabold">Account</h2>
			{session?.account ? (
				<>
					<p className="text-[15px] text-ink-2">
						Signed in as{" "}
						<strong className="text-ink">{session.account.email}</strong>. Your
						games are saved to your account.
					</p>
					<SignOutButton className="self-start" />
				</>
			) : (
				<>
					<p className="text-[15px] text-ink-2">
						Sign in to keep your history across devices. Playing stays free
						without it.
					</p>
					<SignInButtons providers={providers} />
				</>
			)}
		</section>
	);
}

export function Home() {
	usePageMeta({});
	useEffect(() => {
		if (location.hash === "#new-game")
			document.getElementById("new-game")?.scrollIntoView();
	}, []);
	const step = (i: number) => ({ "--i": i }) as CSSProperties;
	return (
		<main className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-12 md:px-8 lg:pt-14 xl:px-12">
			<div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:grid-rows-[auto_1fr]">
				<div className="flex flex-col gap-5 lg:pt-7">
					<span
						style={step(0)}
						className="enter self-start rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-extrabold text-warn-ink"
					>
						No sign-up · up to 8 players
					</span>
					<h1
						style={step(1)}
						className="enter font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.04em] text-balance sm:text-6xl lg:text-[84px]"
					>
						Sudoku, together.
					</h1>
					<p
						style={step(2)}
						className="enter max-w-[44ch] text-[17px] leading-relaxed text-ink-2 lg:text-xl"
					>
						Solve one board with friends, or race them on the same puzzle. Share
						a link and they're in.
					</p>
					<div style={step(2)} className="enter">
						<AppearAs />
					</div>
				</div>
				<div className="flex flex-col gap-6 lg:row-span-2">
					<NewGame />
					<AccountCard />
				</div>
				<div className="flex min-w-0 flex-col gap-10">
					<section aria-labelledby="how-title">
						<h2 id="how-title" className="mb-4 text-lg font-extrabold">
							How it works
						</h2>
						<Steps />
					</section>
					<History />
				</div>
			</div>
		</main>
	);
}
