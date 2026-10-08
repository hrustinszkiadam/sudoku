import { BrowserRouter, Route, Routes, useParams } from "react-router";

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
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/r/:code" element={<Room />} />
			</Routes>
		</BrowserRouter>
	);
}
