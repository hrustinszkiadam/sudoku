import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { CookieNotice } from "./components/CookieNotice";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Loading, StatePanel } from "./components/States";
import { btn } from "./components/ui";
import { Adatkezeles } from "./routes/Adatkezeles";
import { Daily } from "./routes/Daily";
import { Home } from "./routes/Home";
import { Leaderboard } from "./routes/Leaderboard";
import { NotFound } from "./routes/NotFound";
import { Room } from "./routes/Room";
import { useSession } from "./store/session";

const DevBoard = import.meta.env.DEV
	? lazy(() =>
			import("./routes/DevBoard").then((m) => ({ default: m.DevBoard })),
		)
	: null;

export function App() {
	const load = useSession((s) => s.load);
	const error = useSession((s) => s.error);
	useEffect(() => {
		load();
	}, [load]);

	return (
		<BrowserRouter>
			<a
				href="#main"
				className="sr-only fixed top-2 left-2 z-50 rounded-md bg-surface px-4 py-2 font-bold shadow-float focus:not-sr-only"
			>
				Skip to content
			</a>
			<Header />
			<div id="main" tabIndex={-1} className="outline-none">
				{error ? (
					<StatePanel
						mood="error"
						title="Couldn't start your session"
						actions={
							<button
								type="button"
								className={`${btn.primary} ${btn.md}`}
								onClick={load}
							>
								Try again
							</button>
						}
					>
						<span role="alert">{error}</span>
					</StatePanel>
				) : (
					<Suspense fallback={<Loading />}>
						<Routes>
							<Route path="/" element={<Home />} />
							<Route path="/r/:code" element={<Room />} />
							<Route path="/daily" element={<Daily />} />
							<Route path="/leaderboard" element={<Leaderboard />} />
							<Route path="/adatkezeles" element={<Adatkezeles />} />
							{DevBoard && <Route path="/dev/board" element={<DevBoard />} />}
							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				)}
			</div>
			<Footer />
			<CookieNotice />
		</BrowserRouter>
	);
}
