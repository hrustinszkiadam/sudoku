import { Link } from "react-router";
import { usePageMeta } from "../meta";

export function NotFound() {
	usePageMeta({ title: "Page not found", noindex: true });
	return (
		<main className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center">
			<h1 className="text-xl font-bold">Page not found</h1>
			<p className="text-slate-500 dark:text-slate-400">
				There's nothing at this address.
			</p>
			<Link to="/" className="text-sky-600 underline">
				Back home
			</Link>
		</main>
	);
}
