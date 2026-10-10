import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { Home } from "./routes/Home";
import { Room } from "./routes/Room";
import { useSession } from "./store/session";

const DevBoard = import.meta.env.DEV
	? lazy(() =>
			import("./routes/DevBoard").then((m) => ({ default: m.DevBoard })),
		)
	: null;

function Header() {
	const session = useSession((s) => s.session);
	return (
		<header className="border-b border-slate-200 dark:border-slate-800">
			<nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
				<Link to="/" className="text-lg font-bold">
					Sudoku
				</Link>
				{session && (
					<span className="ml-auto truncate text-slate-500 dark:text-slate-400">
						{session.name}
					</span>
				)}
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
					{DevBoard && <Route path="/dev/board" element={<DevBoard />} />}
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}
