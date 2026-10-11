import { create } from "zustand";

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export const THEME_PREFS = ["light", "dark", "system"] as const;

/** Keep in sync with the inline script in index.html, which runs before paint. */
const KEY = "sudoku:theme";
/** Browser bar colour per theme: the header surface. */
const BAR: Record<Theme, string> = { light: "#FCFDFF", dark: "#111828" };

const media =
	typeof matchMedia === "function"
		? matchMedia("(prefers-color-scheme: dark)")
		: null;

function readPref(): ThemePref {
	try {
		const v = localStorage.getItem(KEY);
		return THEME_PREFS.includes(v as ThemePref) ? (v as ThemePref) : "system";
	} catch {
		return "system";
	}
}

const resolve = (pref: ThemePref): Theme =>
	pref === "system" ? (media?.matches ? "dark" : "light") : pref;

function apply(theme: Theme): void {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.theme = theme;
	for (const m of document.querySelectorAll<HTMLMetaElement>(
		'meta[name="theme-color"]',
	))
		m.content = BAR[theme];
}

interface ThemeState {
	pref: ThemePref;
	theme: Theme;
	setPref: (pref: ThemePref) => void;
}

/** Light, dark or follow the system; remembered per browser. */
export const useTheme = create<ThemeState>((set) => {
	const pref = readPref();
	const theme = resolve(pref);
	apply(theme);
	media?.addEventListener("change", () => {
		const { pref } = useTheme.getState();
		if (pref !== "system") return;
		const theme = resolve(pref);
		apply(theme);
		set({ theme });
	});
	return {
		pref,
		theme,
		setPref(pref) {
			try {
				localStorage.setItem(KEY, pref);
			} catch {
				// Not persisted; still applies for this visit.
			}
			const theme = resolve(pref);
			apply(theme);
			set({ pref, theme });
		},
	};
});
