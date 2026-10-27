import { Link, useLocation } from "react-router";

/** One quiet line under every page except rooms, where the board owns the screen. */
export function Footer() {
	const { pathname } = useLocation();
	if (pathname.startsWith("/r/")) return null;
	return (
		<footer className="mx-auto max-w-[1280px] px-4 pt-4 pb-8 text-center text-[13px] text-ink-3 md:px-12">
			© Hrustinszki Ádám ·{" "}
			<Link
				to="/privacy"
				className="font-bold underline underline-offset-2 hover:text-ink"
			>
				Privacy policy
			</Link>
		</footer>
	);
}
