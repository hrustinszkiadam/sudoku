import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useStore } from "zustand";
import { countFilled } from "../../shared/sudoku/grid";
import type { Notes } from "../../shared/sudoku/notes";
import { isNotesArray } from "../../shared/sudoku/notes";
import { Board, type OtherSelection } from "../components/Board";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { completedDigits } from "../components/digits";
import { NumberPad } from "../components/NumberPad";
import { PlayerList } from "../components/PlayerList";
import { Results } from "../components/Results";
import { Timer } from "../components/Timer";
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

	if (!session || preview === null) {
		return <p className="p-6 text-center text-slate-500">Loading…</p>;
	}
	if (preview === "error" || !preview.exists) {
		return (
			<main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center">
				<h1 className="text-xl font-bold">Room {code} not found</h1>
				<p className="text-slate-500">
					It may have expired after a day of inactivity.
				</p>
				<Link to="/" className="text-sky-600 underline">
					Back home
				</Link>
			</main>
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

function useNow(active: boolean, intervalMs = 250) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [active, intervalMs]);
	return now;
}

function RoomView({ code, store }: { code: string; store: RoomStore }) {
	const s = useStore(store);
	const [copied, setCopied] = useState<"code" | "link" | null>(null);
	const race = s.mode === "race";
	const isHost = s.me === s.hostId;
	usePageMeta({
		title: s.loaded
			? `${s.status === "finished" ? "Finished · " : ""}Room ${code} · ${race ? "Race" : "Co-op"}, ${s.difficulty}`
			: `Room ${code}`,
		noindex: true,
	});

	const countingDown =
		race &&
		s.status === "playing" &&
		s.startsAt !== null &&
		s.startsAt > Date.now();
	const now = useNow(countingDown);
	const countdown =
		countingDown && s.startsAt !== null
			? Math.ceil((s.startsAt - now) / 1000)
			: 0;
	const canPlay = s.loaded && s.status === "playing" && countdown <= 0;

	useBoardKeyboard(s, canPlay);

	useEffect(() => {
		if (!s.lastError) return;
		const id = setTimeout(() => store.getState().dismissError(), 3000);
		return () => clearTimeout(id);
	}, [s.lastError, store]);

	const others = useMemo<OtherSelection[]>(
		() =>
			s.players
				.filter((p) => p.userId !== s.me && p.connected && p.selected !== null)
				.map((p) => ({
					cell: p.selected as number,
					color: p.color,
					name: p.name,
				})),
		[s.players, s.me],
	);
	const done = useMemo(() => completedDigits(s.board), [s.board]);
	const toFill = 81 - countFilled(s.givens);

	const copy = async (what: "code" | "link") => {
		try {
			await navigator.clipboard.writeText(
				what === "code" ? code : `${location.origin}/r/${code}`,
			);
			setCopied(what);
			setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
		} catch {
			setCopied(null);
		}
	};
	const copyButton =
		"rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600";

	if (!s.loaded) {
		return (
			<main className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6">
				<ConnectionBanner status={s.conn} />
			</main>
		);
	}

	const lobby = race && s.status === "lobby";
	const connectedCount = s.players.filter((p) => p.connected).length;

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:flex-row md:items-start">
			<div className="flex w-full flex-col items-center gap-3 md:max-w-[32rem]">
				<div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="font-mono text-lg font-bold tracking-widest">
							{code}
						</h1>
						<button
							type="button"
							onClick={() => copy("code")}
							className={copyButton}
						>
							{copied === "code" ? "✓ Copied" : "Copy code"}
						</button>
						<button
							type="button"
							onClick={() => copy("link")}
							className={copyButton}
						>
							{copied === "link" ? "✓ Copied" : "Copy invite link"}
						</button>
					</div>
					<span className="rounded bg-slate-200 px-2 py-0.5 dark:bg-slate-700">
						{race ? "Race" : "Co-op"} ·{" "}
						<span className="capitalize">{s.difficulty}</span>
					</span>
				</div>

				<div className="flex w-full items-center justify-between text-sm">
					<span>
						<Timer
							from={race ? s.startsAt : s.startedAt}
							to={s.status === "finished" ? s.finishedAt : null}
						/>
						{!race && s.status === "playing" && s.startedAt === null && (
							<span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
								· starts with the first move
							</span>
						)}
					</span>
					<span aria-live="polite">
						{race ? "Your mistakes" : "Mistakes"}: <strong>{s.mistakes}</strong>
						{s.hints > 0 && (
							<>
								{" · "}Hints: <strong>{s.hints}</strong>
							</>
						)}
					</span>
				</div>

				<ConnectionBanner status={s.conn} />
				{s.lastError && (
					<div
						role="alert"
						className="w-full rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
					>
						{s.lastError}
					</div>
				)}

				{lobby ? (
					<section className="flex w-full flex-col items-center gap-3 rounded-lg border border-slate-200 p-6 text-center dark:border-slate-700">
						<h2 className="text-lg font-semibold">Race lobby</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Share the invite link. {connectedCount} player
							{connectedCount === 1 ? "" : "s"} here.
						</p>
						{isHost ? (
							<button
								type="button"
								onClick={s.start}
								disabled={connectedCount < 2}
								className="rounded-md bg-sky-600 px-6 py-2 font-semibold text-white disabled:opacity-50"
							>
								Start race
							</button>
						) : (
							<p className="text-sm">Waiting for the host to start…</p>
						)}
						{isHost && connectedCount < 2 && (
							<p className="text-xs text-slate-500">
								At least 2 players are needed.
							</p>
						)}
					</section>
				) : (
					<div className="relative w-full">
						<Board
							givens={s.givens}
							board={s.board}
							notes={s.notes}
							selected={s.selected}
							pending={s.pending}
							flashing={s.flashing}
							others={race ? undefined : others}
							onSelect={(cell) => canPlay && s.select(cell)}
						/>
						{countdown > 0 && (
							<div
								role="timer"
								aria-live="assertive"
								className="absolute inset-0 flex items-center justify-center rounded-md bg-white/80 text-7xl font-bold dark:bg-slate-900/80"
							>
								{countdown}
							</div>
						)}
					</div>
				)}

				{!lobby && s.status === "playing" && (
					<NumberPad
						notesMode={s.notesMode}
						completed={done}
						onDigit={(d) => (s.notesMode ? s.toggleNote(d) : s.place(d))}
						onToggleNotes={s.toggleNotesMode}
						onClearNotes={s.clearNotes}
						onHint={s.hint}
						onUndo={s.undoNote}
						canUndo={s.noteHistory.length > 0}
					/>
				)}
			</div>

			<aside className="flex w-full flex-col gap-3 md:max-w-sm">
				{s.status === "finished" && s.results && (
					<Results results={s.results} me={s.me} race={race} />
				)}
				<h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
					Players
				</h2>
				<PlayerList
					players={s.players}
					me={s.me}
					hostId={s.hostId}
					progress={race ? { total: toFill } : undefined}
				/>
				{race && isHost && s.status === "playing" && (
					<button
						type="button"
						onClick={s.end}
						className="self-start rounded-md border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
					>
						End race now
					</button>
				)}
				<Link to="/" className="text-sm text-sky-600 underline">
					Leave room
				</Link>
			</aside>
		</main>
	);
}
