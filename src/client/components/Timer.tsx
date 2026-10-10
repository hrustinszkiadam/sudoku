import { useEffect, useState } from "react";

export const formatMs = (ms: number): string => {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(h ? 2 : 1, "0");
	return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

/** Elapsed time rendered client-side from server timestamps. */
export function Timer({
	from,
	to,
}: {
	from: number | null;
	to: number | null;
}) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (to !== null) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [to]);
	const elapsed = from === null ? 0 : (to ?? now) - from;
	return (
		<span className="font-mono tabular-nums">
			<span aria-hidden>⏱ </span>
			<span className="sr-only">Elapsed time </span>
			{formatMs(elapsed)}
		</span>
	);
}
