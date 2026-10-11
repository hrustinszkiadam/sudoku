import {
	IconAlertTriangle,
	IconCheck,
	IconStopwatch,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useStore } from "zustand";
import { countFilled, digitAt } from "../../shared/sudoku/grid";
import type { Notes } from "../../shared/sudoku/notes";
import { isNotesArray } from "../../shared/sudoku/notes";
import { Board, type OtherSelection } from "../components/Board";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { completedDigits } from "../components/digits";
import { HowToPlay, ShortcutSheet } from "../components/Help";
import { NumberPad } from "../components/NumberPad";
import { Countdown } from "../components/room/Countdown";
import { InviteCard, InviteSheet } from "../components/room/Invite";
import { Lobby } from "../components/room/Lobby";
import { OnboardingTip } from "../components/room/OnboardingTip";
import {
	ordinal,
	PlayersCard,
	RaceLanes,
	RaceTrack,
	raceOrder,
} from "../components/room/People";
import { RoomResults } from "../components/room/Results";
import { RoomBar, RoomExits } from "../components/room/RoomBar";
import { Loading, StatePanel } from "../components/States";
import { Timer } from "../components/Timer";
import { btn, I } from "../components/ui";
import { useBoardKeyboard } from "../components/useBoardKeyboard";
import { usePageMeta } from "../meta";
import { api, type RoomPreview } from "../net/api";
import { openRoomSocket, type RoomSocket } from "../net/socket";
import { play } from "../sound";
import {
	createRoomStore,
	type NotesStorage,
	type RoomStore,
} from "../store/room";
import { useSession } from "../store/session";

/** Race notes live only in this browser. */
function localNotes(code: string): NotesStorage {
	const key = `sudoku:notes:${code}`;
	return {
		load() {
			try {
				const v: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
				return isNotesArray(v) ? v : null;
			} catch {
				return null;
			}
		},
		save(notes: Notes) {
			try {
				localStorage.setItem(key, JSON.stringify(notes));
			} catch {
				// Storage full or disabled: notes stay in memory.
			}
		},
	};
}

export function Room() {
	const code = (useParams().code ?? "").toUpperCase();
	usePageMeta({ title: `Room ${code}`, noindex: true });
	const session = useSession((s) => s.session);
	const [preview, setPreview] = useState<RoomPreview | "error" | null>(null);

	useEffect(() => {
		if (!session) return;
		setPreview(null);
		api
			.room(code)
			.then(setPreview)
			.catch(() => setPreview("error"));
	}, [code, session]);

	if (!session || preview === null) return <Loading />;
	if (preview === "error" || !preview.exists) {
		return (
			<StatePanel
				mood="question"
				title="Room not found"
				actions={
					<>
						<Link to="/" className={`${btn.primary} ${btn.md}`}>
							Back home
						</Link>
						<Link
							to="/#new-game"
							className="text-[15px] font-extrabold text-brand-strong underline underline-offset-2"
						>
							Start a new room
						</Link>
					</>
				}
			>
				It may have expired after a day of inactivity.
			</StatePanel>
		);
	}
	return <RoomSession code={code} />;
}

function RoomSession({ code }: { code: string }) {
	const [store, setStore] = useState<RoomStore | null>(null);

	useEffect(() => {
		let socket: RoomSocket | null = null;
		const s = createRoomStore((msg) => socket?.send(msg), localNotes(code));
		socket = openRoomSocket(code, {
			onMessage: (msg) => {
				s.getState().handle(msg);
				const me = s.getState().me;
				if (msg.type === "applied" && msg.by === me) play("place");
				else if (msg.type === "mistake" && msg.by === me) play("mistake");
				else if (msg.type === "game_over") play("win");
			},
			onStatus: (status) => s.getState().setConn(status),
		});
		setStore(s);
		return () => socket?.close();
	}, [code]);

	if (!store) return null;
	return <RoomView code={code} store={store} />;
}

function useNow(active: boolean, intervalMs = 100) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active) return;
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [active, intervalMs]);
	return now;
}

/** How long "Go!" stays up after the countdown. */
const GO_MS = 400;

const phone = () =>
	typeof matchMedia === "function" && matchMedia("(max-width: 767px)").matches;

function RoomView({ code, store }: { code: string; store: RoomStore }) {
	const s = useStore(store);
	const race = s.mode === "race";
	const isHost = s.me === s.hostId;
	const [sheet, setSheet] = useState<"invite" | "help" | "keys" | null>(null);
	usePageMeta({
		title: s.loaded
			? `${s.status === "finished" ? "Finished · " : ""}Room ${code} · ${race ? "Race" : "Co-op"}, ${s.difficulty}`
			: `Room ${code}`,
		noindex: true,
	});

	const startsAt = race && s.status === "playing" ? s.startsAt : null;
	const countingDown = startsAt !== null && Date.now() < startsAt + GO_MS;
	const now = useNow(countingDown);
	const msLeft = startsAt === null ? 0 : startsAt - now;
	const showCountdown = startsAt !== null && msLeft > -GO_MS;
	const replaced = s.conn === "replaced";
	// One tick per countdown number, a brighter tone on Go.
	const beat = showCountdown
		? msLeft <= 0
			? 0
			: Math.ceil(msLeft / 1000)
		: -1;
	useEffect(() => {
		if (beat > 0) play("tick");
		else if (beat === 0) play("go");
	}, [beat]);
	const canPlay =
		s.loaded && s.status === "playing" && msLeft <= 0 && !replaced;

	useBoardKeyboard(s, canPlay);

	// "?" opens the shortcut sheet anywhere in the room.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t?.closest("input, textarea, select, [contenteditable]")) return;
			if (e.key === "?") {
				e.preventDefault();
				setSheet((v) => (v === "keys" ? null : "keys"));
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (!s.lastError) return;
		const id = setTimeout(() => store.getState().dismissError(), 3000);
		return () => clearTimeout(id);
	}, [s.lastError, store]);

	// Phones: offer the invite once when you open a fresh co-op room alone.
	const alone = s.players.length === 1;
	useEffect(() => {
		if (!s.loaded || race || !alone || !isHost || s.startedAt !== null) return;
		const key = `sudoku:invited:${code}`;
		try {
			if (sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, "1");
		} catch {
			return;
		}
		if (phone()) setSheet("invite");
	}, [s.loaded, race, alone, isHost, s.startedAt, code]);

	const others = useMemo<OtherSelection[]>(
		() =>
			s.players
				.filter((p) => p.userId !== s.me && p.connected && p.selected !== null)
				.map((p) => ({
					cell: p.selected as number,
					pencil: p.pencil,
					name: p.name,
				})),
		[s.players, s.me],
	);
	const recent = useMemo(() => {
		const out = new Map<number, number>();
		for (const [cell, by] of s.recent) {
			const p = s.players.find((x) => x.userId === by);
			if (p) out.set(cell, p.pencil);
		}
		return out;
	}, [s.recent, s.players]);
	const done = useMemo(() => completedDigits(s.board), [s.board]);
	const toFill = 81 - countFilled(s.givens);

	if (!s.loaded) {
		return (
			<>
				<ConnectionBanner status={s.conn} />
				<Loading />
			</>
		);
	}

	const finished = s.status === "finished";
	const lobby = race && s.status === "lobby";
	const connectedCount = s.players.filter((p) => p.connected).length;
	const me = s.players.find((p) => p.userId === s.me);
	const myResult = s.results?.find((r) => r.userId === s.me);

	// Timer end: my own finish in a race, else the room's.
	const myFinish =
		race && me?.finished && me.finishMs !== null && s.startsAt !== null
			? s.startsAt + me.finishMs
			: null;
	const timerEnd = myFinish ?? (finished ? s.finishedAt : null);
	const myPlace =
		myResult?.rank ??
		raceOrder(s.players).findIndex((p) => p.userId === s.me) + 1;
	const doneLabel = !race
		? finished
			? "Solved in"
			: null
		: me?.finished
			? `Finished ${myPlace ? `${ordinal(myPlace)} ` : ""}in`
			: null;
	const waiting = !race && s.status === "playing" && s.startedAt === null;
	const selectedEmpty =
		s.selected !== null &&
		digitAt(s.board, s.selected) === 0 &&
		!s.pending.has(s.selected);

	const sheets = (
		<>
			<InviteSheet
				open={sheet === "invite"}
				onClose={() => setSheet(null)}
				code={code}
				mode={s.mode}
				difficulty={s.difficulty}
			/>
			<HowToPlay open={sheet === "help"} onClose={() => setSheet(null)} />
			<ShortcutSheet open={sheet === "keys"} onClose={() => setSheet(null)} />
		</>
	);

	const bar = (
		<RoomBar
			code={code}
			mode={s.mode}
			difficulty={s.difficulty}
			onInvite={() => setSheet("invite")}
			onHelp={() => setSheet("help")}
		/>
	);
	const footer = (
		<div className="mt-[18px] flex justify-center gap-2 md:hidden">
			<RoomExits onHelp={() => setSheet("help")} />
		</div>
	);

	if (replaced) {
		return (
			<>
				<ConnectionBanner status={s.conn} />
				<StatePanel
					mood="locked"
					title="Playing in another tab"
					actions={
						<button
							type="button"
							onClick={() => location.reload()}
							className={`${btn.primary} ${btn.md}`}
						>
							Reload
						</button>
					}
				>
					Your progress is safe. Reload this tab to move the game here.
				</StatePanel>
			</>
		);
	}

	return (
		<>
			<ConnectionBanner status={s.conn} />
			<main className="mx-auto w-full max-w-[1280px] px-4 pb-7 md:px-8 lg:pb-10 xl:px-12">
				{bar}
				{lobby ? (
					<div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,848px)_minmax(0,296px)] lg:gap-10">
						<Lobby
							code={code}
							difficulty={s.difficulty}
							connected={connectedCount}
							isHost={isHost}
							onStart={s.start}
						/>
						<PlayersCard
							players={s.players}
							me={s.me}
							hostId={s.hostId}
							lobby
						/>
					</div>
				) : (
					<div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,512px)_minmax(296px,1fr)] lg:gap-x-10 lg:gap-y-6 xl:grid-cols-[512px_296px_minmax(0,296px)]">
						<div className="mx-auto w-full max-w-lg lg:row-span-2">
							<div className="mb-2 flex h-8 items-center justify-between gap-3 lg:h-[34px]">
								<div className="flex min-w-0 items-center gap-2">
									{doneLabel ? (
										<>
											<I icon={IconCheck} className="text-success" />
											<span className="text-[13px] font-bold whitespace-nowrap text-success lg:text-sm">
												{doneLabel}
											</span>
										</>
									) : (
										<I icon={IconStopwatch} className="text-ink-2" />
									)}
									<Timer
										from={race ? s.startsAt : s.startedAt}
										to={timerEnd}
										className="text-lg lg:text-[22px]"
									/>
									{waiting && (
										<span className="truncate text-xs text-ink-3">
											· starts with the first move
										</span>
									)}
								</div>
								<div
									aria-live="polite"
									className={`items-baseline gap-4 text-[13px] whitespace-nowrap text-ink-2 lg:text-sm ${waiting ? "hidden sm:flex" : "flex"}`}
								>
									<span className="flex items-baseline gap-1.5">
										{race ? "Your mistakes" : "Mistakes"}
										<strong
											key={s.mistakes}
											className={`font-mono text-[15px] lg:text-[17px] ${s.mistakes > 0 ? "tick" : ""}`}
										>
											{s.mistakes}
										</strong>
									</span>
									{s.hints > 0 && (
										<span className="flex items-baseline gap-1.5">
											Hints
											<strong className="font-mono text-[15px] lg:text-[17px]">
												{s.hints}
											</strong>
										</span>
									)}
								</div>
							</div>

							{race && s.status === "playing" && (
								<RaceTrack players={s.players} me={s.me} total={toFill} />
							)}

							<div className="relative">
								<Board
									givens={s.givens}
									board={s.board}
									notes={s.notes}
									selected={s.selected}
									pending={s.pending}
									flashing={s.flashing}
									recent={race ? undefined : recent}
									others={race ? undefined : others}
									readOnly={finished}
									celebrate={finished}
									onSelect={(cell) => canPlay && s.select(cell)}
								/>
								{showCountdown && (
									<Countdown msLeft={msLeft} racers={connectedCount} />
								)}
								{s.lastError && (
									<div
										role="alert"
										className="banner-in absolute top-2.5 left-1/2 z-5 flex -translate-x-1/2 items-center gap-2 rounded-md bg-toast py-2.5 pr-3.5 pl-3 text-sm font-bold whitespace-nowrap text-white shadow-[0_12px_28px_-8px_rgb(0_0_0/0.45)] lg:top-3.5"
									>
										<I icon={IconAlertTriangle} size={18} />
										{s.lastError}
									</div>
								)}
							</div>
						</div>

						{finished && s.results ? (
							<div className="mx-auto w-full max-w-lg lg:max-w-none lg:pt-[42px] xl:col-span-2">
								<RoomResults
									results={s.results}
									players={s.players}
									me={s.me}
									mode={s.mode}
									difficulty={s.difficulty}
									teamMs={
										s.startedAt !== null && s.finishedAt !== null
											? s.finishedAt - s.startedAt
											: null
									}
								/>
							</div>
						) : (
							<>
								<div className="mx-auto flex w-full max-w-lg flex-col gap-3.5 lg:max-w-none lg:pt-[42px]">
									{s.status === "playing" && (
										<OnboardingTip onRules={() => setSheet("help")} />
									)}
									{s.status === "playing" && (
										<NumberPad
											notesMode={s.notesMode}
											completed={done}
											disabled={!canPlay}
											onDigit={(d) =>
												s.notesMode ? s.toggleNote(d) : s.place(d)
											}
											onToggleNotes={s.toggleNotesMode}
											onClearNotes={s.clearNotes}
											onHint={s.hint}
											canHint={selectedEmpty}
											onUndo={s.undoNote}
											canUndo={s.noteHistory.length > 0}
										/>
									)}
								</div>
								<div className="mx-auto flex w-full max-w-lg flex-col gap-4 lg:col-start-2 lg:max-w-none xl:col-start-3 xl:row-start-1 xl:pt-[42px]">
									{!race && alone && s.status === "playing" && (
										<div className="hidden lg:block">
											<InviteCard code={code} />
										</div>
									)}
									{race ? (
										<RaceLanes
											players={s.players}
											me={s.me}
											hostId={s.hostId}
											total={toFill}
											onEnd={
												isHost && s.status === "playing" ? s.end : undefined
											}
										/>
									) : (
										<PlayersCard
											players={s.players}
											me={s.me}
											hostId={s.hostId}
										/>
									)}
								</div>
							</>
						)}
					</div>
				)}
				{footer}
			</main>
			{sheets}
		</>
	);
}
