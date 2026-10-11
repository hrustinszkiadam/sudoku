import { useCallback, useEffect, useRef, useState } from "react";

export const inviteUrl = (code: string) => `${location.origin}/r/${code}`;

/** Copies text; `copied` holds the key of the last successful copy for 2 s. */
export function useCopy<K extends string>() {
	const [copied, setCopied] = useState<K | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	const copy = useCallback(async (text: string, key: K) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(key);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(null), 2000);
		} catch {
			setCopied(null);
		}
	}, []);
	return { copied, copy };
}

export const canShare = () =>
	typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Web Share API; returns false when unavailable so callers can copy instead. */
export async function shareInvite(code: string): Promise<boolean> {
	if (!canShare()) return false;
	try {
		await navigator.share({
			title: "Join my sudoku room",
			text: `Join my sudoku room ${code}`,
			url: inviteUrl(code),
		});
	} catch {
		// Dismissed by the user: nothing to do.
	}
	return true;
}
