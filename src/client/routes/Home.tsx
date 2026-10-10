import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { DIFFICULTIES, MODES, ROOM_CODE_LENGTH } from "../../shared/constants";
import { Turnstile } from "../components/Turnstile";
import { ApiError, api } from "../net/api";
import { useSession } from "../store/session";
import type { Difficulty, Mode } from "../types";

const MODE_LABEL: Record<Mode, string> = {
	coop: "Co-op",
	race: "Race",
};
const MODE_HINT: Record<Mode, string> = {
	coop: "Everyone fills one shared board. Play alone for single-player.",
	race: "Same puzzle, separate boards. Fastest time + 10 s per mistake wins.",
};

const card =
	"flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const button =
	"rounded-md bg-sky-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-amber-500";
const input =
	"rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800";

function NameForm() {
	const session = useSession((s) => s.session);
	const rename = useSession((s) => s.rename);
	const [name, setName] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	useEffect(() => setName(session?.name ?? ""), [session?.name]);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		const error = await rename(name);
		setStatus(error ?? "Saved");
	};

	return (
		<form className={card} onSubmit={submit}>
			<label htmlFor="nickname" className="font-semibold">
				Your nickname
			</label>
			<div className="flex gap-2">
				<input
					id="nickname"
					className={`${input} min-w-0 flex-1`}
					value={name}
					maxLength={40}
					onChange={(e) => {
						setName(e.target.value);
						setStatus(null);
					}}
				/>
				<button type="submit" className={button} disabled={!session}>
					Save
				</button>
			</div>
			{status && (
				<p role="status" className="text-sm text-slate-600 dark:text-slate-300">
					{status}
				</p>
			)}
		</form>
	);
}

function CreateRoom() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<Mode>("coop");
	const [difficulty, setDifficulty] = useState<Difficulty>("easy");
	const [siteKey, setSiteKey] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [resetKey, setResetKey] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
				err instanceof ApiError ? err.message : "Could not create the room",
			);
			setResetKey((k) => k + 1);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form className={card} onSubmit={submit}>
			<h2 className="text-lg font-semibold">New game</h2>
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-1 text-sm font-medium">Mode</legend>
				<div className="grid grid-cols-2 gap-2">
					{MODES.map((m) => (
						<label
							key={m}
							className={`cursor-pointer rounded-md border px-3 py-2 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber-500 ${
								mode === m
									? "border-sky-600 bg-sky-50 font-semibold dark:bg-sky-950"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							<input
								type="radio"
								name="mode"
								value={m}
								className="sr-only"
								checked={mode === m}
								onChange={() => setMode(m)}
							/>
							{MODE_LABEL[m]}
						</label>
					))}
				</div>
				<p className="text-xs text-slate-500 dark:text-slate-400">
					{MODE_HINT[mode]}
				</p>
			</fieldset>
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-1 text-sm font-medium">Difficulty</legend>
				<div className="grid grid-cols-4 gap-1">
					{DIFFICULTIES.map((d) => (
						<label
							key={d}
							className={`cursor-pointer rounded-md border px-1 py-2 text-center text-sm capitalize has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber-500 ${
								difficulty === d
									? "border-sky-600 bg-sky-50 font-semibold dark:bg-sky-950"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							<input
								type="radio"
								name="difficulty"
								value={d}
								className="sr-only"
								checked={difficulty === d}
								onChange={() => setDifficulty(d)}
							/>
							{d}
						</label>
					))}
				</div>
			</fieldset>
			{siteKey && (
				<Turnstile siteKey={siteKey} onToken={setToken} resetKey={resetKey} />
			)}
			<button type="submit" className={button} disabled={!token || busy}>
				{busy ? "Creating…" : "Create room"}
			</button>
			{error && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					{error}
				</p>
			)}
		</form>
	);
}

function JoinRoom() {
	const navigate = useNavigate();
	const [code, setCode] = useState("");
	const valid = code.length === ROOM_CODE_LENGTH;
	return (
		<form
			className={card}
			onSubmit={(e) => {
				e.preventDefault();
				if (valid) navigate(`/r/${code}`);
			}}
		>
			<label htmlFor="room-code" className="text-lg font-semibold">
				Join a room
			</label>
			<div className="flex gap-2">
				<input
					id="room-code"
					className={`${input} min-w-0 flex-1 font-mono tracking-widest uppercase`}
					placeholder="ABC234"
					autoComplete="off"
					value={code}
					maxLength={ROOM_CODE_LENGTH}
					onChange={(e) =>
						setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
					}
				/>
				<button type="submit" className={button} disabled={!valid}>
					Join
				</button>
			</div>
		</form>
	);
}

export function Home() {
	return (
		<main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
			<NameForm />
			<CreateRoom />
			<JoinRoom />
		</main>
	);
}
