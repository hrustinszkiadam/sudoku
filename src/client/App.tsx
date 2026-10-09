import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router";

const DevBoard = import.meta.env.DEV
	? lazy(() =>
			import("./routes/DevBoard").then((m) => ({ default: m.DevBoard })),
		)
	: null;

function Home() {
	return <h1 className="p-4 text-2xl font-bold">Sudoku</h1>;
}

function Room() {
	const { code } = useParams();
	return <h1 className="p-4 text-2xl font-bold">Room {code}</h1>;
}

export function App() {
	return (
		<BrowserRouter>
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
