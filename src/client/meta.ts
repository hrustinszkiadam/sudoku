import { useEffect } from "react";

export const SITE_URL = "https://sudoku.hrustinszki.com";
export const DEFAULT_TITLE = "Multiplayer Sudoku: play together in real time";

export interface PageMeta {
	/** Page name, shown as "<title> · Sudoku". Omit for the home page. */
	title?: string;
	description?: string;
	/** Path for the canonical URL; omitted pages fall back to the home page. */
	path?: string;
	/** Keep private or utility pages (rooms, 404, dev) out of search results. */
	noindex?: boolean;
}

function setMeta(selector: string, attr: string, value: string): string | null {
	const el = document.head.querySelector(selector);
	if (!el) return null;
	const before = el.getAttribute(attr);
	el.setAttribute(attr, value);
	return before;
}

/** Per-page title, description, canonical URL and robots, restored on unmount. */
export function usePageMeta({ title, description, path, noindex }: PageMeta) {
	useEffect(() => {
		const prevTitle = document.title;
		document.title = title ? `${title} · Sudoku` : DEFAULT_TITLE;
		const url = `${SITE_URL}${path ?? "/"}`;
		const restores: [string, string, string | null][] = [
			[
				"link[rel=canonical]",
				"href",
				setMeta("link[rel=canonical]", "href", url),
			],
			[
				'meta[property="og:url"]',
				"content",
				setMeta('meta[property="og:url"]', "content", url),
			],
			[
				"meta[name=robots]",
				"content",
				setMeta(
					"meta[name=robots]",
					"content",
					noindex ? "noindex, nofollow" : "index, follow",
				),
			],
		];
		if (description) {
			restores.push([
				"meta[name=description]",
				"content",
				setMeta("meta[name=description]", "content", description),
			]);
		}
		return () => {
			document.title = prevTitle;
			for (const [selector, attr, value] of restores) {
				if (value !== null) setMeta(selector, attr, value);
			}
		};
	}, [title, description, path, noindex]);
}
