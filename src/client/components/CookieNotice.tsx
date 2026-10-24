import { useState } from "react";
import { Link, useLocation } from "react-router";
import { btn } from "./ui";

const KEY = "sudoku:cookie-notice";

function seen(): boolean {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}

/**
 * First-visit notice. Everything stored is strictly necessary and the
 * analytics are cookieless, so this informs rather than asks for consent.
 */
export function CookieNotice() {
	const [show, setShow] = useState(() => !seen());
	const { pathname } = useLocation();
	if (!show || pathname === "/adatkezeles") return null;
	const dismiss = () => {
		try {
			localStorage.setItem(KEY, "1");
		} catch {
			// Storage disabled: the notice just shows again next visit.
		}
		setShow(false);
	};
	return (
		<section
			aria-label="Cookie notice"
			className="results-rise fixed inset-x-4 bottom-4 z-40 rounded-xl bg-raised p-4 text-ink shadow-float sm:right-auto sm:w-[380px] md:bottom-6 md:left-6"
		>
			<p className="text-[15px] font-bold">Cookies, briefly</p>
			<p className="mt-1.5 text-sm text-ink-2">
				We only use cookies and local storage the site needs to work: your game
				session, sign-in, and your theme and sound settings. Visits are counted
				with Cloudflare Web Analytics, which is cookieless and doesn't follow
				you across sites. No ads.
			</p>
			<div className="mt-3 flex items-center justify-between gap-3">
				<Link
					to="/adatkezeles"
					className="text-sm font-extrabold text-brand underline underline-offset-2"
				>
					Privacy policy (HU)
				</Link>
				<button
					type="button"
					onClick={dismiss}
					className={`${btn.primary} ${btn.sm} px-5`}
				>
					OK
				</button>
			</div>
		</section>
	);
}
