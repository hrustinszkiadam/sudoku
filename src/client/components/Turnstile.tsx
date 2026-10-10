import { useEffect, useRef } from "react";

interface TurnstileApi {
	render(
		el: HTMLElement,
		opts: {
			sitekey: string;
			callback: (token: string) => void;
			"expired-callback": () => void;
			"error-callback": () => void;
			theme?: "auto";
		},
	): string;
	reset(id: string): void;
	remove(id: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const SCRIPT =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	loading ??= new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = SCRIPT;
		s.async = true;
		s.onload = () =>
			window.turnstile
				? resolve(window.turnstile)
				: reject(new Error("Turnstile missing"));
		s.onerror = () => {
			loading = null;
			reject(new Error("Could not load Turnstile"));
		};
		document.head.append(s);
	});
	return loading;
}

export interface TurnstileProps {
	siteKey: string;
	onToken: (token: string | null) => void;
	/** Increment to get a fresh token (tokens are single-use). */
	resetKey: number;
}

export function Turnstile({ siteKey, onToken, resetKey }: TurnstileProps) {
	const el = useRef<HTMLDivElement>(null);
	const widget = useRef<string | null>(null);
	const onTokenRef = useRef(onToken);
	onTokenRef.current = onToken;

	useEffect(() => {
		let cancelled = false;
		loadTurnstile()
			.then((ts) => {
				if (cancelled || !el.current) return;
				widget.current = ts.render(el.current, {
					sitekey: siteKey,
					theme: "auto",
					callback: (t) => onTokenRef.current(t),
					"expired-callback": () => onTokenRef.current(null),
					"error-callback": () => onTokenRef.current(null),
				});
			})
			.catch(() => onTokenRef.current(null));
		return () => {
			cancelled = true;
			if (widget.current) window.turnstile?.remove(widget.current);
			widget.current = null;
		};
	}, [siteKey]);

	useEffect(() => {
		if (resetKey > 0 && widget.current) {
			onTokenRef.current(null);
			window.turnstile?.reset(widget.current);
		}
	}, [resetKey]);

	return <div ref={el} className="min-h-[65px]" />;
}
