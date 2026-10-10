import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router";
import { InstallButton } from "./components/InstallButton";
import { Daily } from "./routes/Daily";
import { Home } from "./routes/Home";
import { Leaderboard } from "./routes/Leaderboard";
import { Room } from "./routes/Room";
import { useSound } from "./sound";
import { useSession } from "./store/session";

const DevBoard = import.meta.env.DEV
	? lazy(() =>
			import("./routes/DevBoard").then((m) => ({ default: m.DevBoard })),
		)
	: null;

const navClass = ({ isActive }: { isActive: boolean }) =>
	isActive ? "font-semibold underline" : "hover:underline";

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
			className="rounded px-1"
		>
			{enabled ? "🔊" : "🔇"}
		</button>
	);
}

function Header() {
	const session = useSession((s) => s.session);
	return (
		<header className="border-b border-slate-200 dark:border-slate-800">
			<nav className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 text-sm sm:gap-4">
				<Link to="/" className="text-lg font-bold">
					Sudoku
				</Link>
				<NavLink to="/daily" className={navClass}>
					Daily
				</NavLink>
				<NavLink to="/leaderboard" className={navClass}>
					Leaderboard
				</NavLink>
				<span className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
					<InstallButton />
					<SoundToggle />
					{session && (
						<span className="min-w-0 max-w-32 truncate text-slate-500 dark:text-slate-400">
							{session.name}
						</span>
					)}
				</span>
			</nav>
		</header>
	);
}

export function App() {
	const load = useSession((s) => s.load);
	const error = useSession((s) => s.error);
	useEffect(() => {
		load();
	}, [load]);

	return (
		<BrowserRouter>
			<Header />
			{error && (
				<p role="alert" className="p-4 text-center text-red-600">
					{error}
				</p>
			)}
			<Suspense fallback={null}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/r/:code" element={<Room />} />
					<Route path="/daily" element={<Daily />} />
					<Route path="/leaderboard" element={<Leaderboard />} />
					{DevBoard && <Route path="/dev/board" element={<DevBoard />} />}
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}
