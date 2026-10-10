import type { ConnectionStatus } from "../types";

const TEXT: Partial<Record<ConnectionStatus, string>> = {
	connecting: "Connecting…",
	reconnecting: "Reconnecting…",
	replaced: "This room is open in another tab. Reload to play here.",
};

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
	const text = TEXT[status];
	if (!text) return null;
	return (
		<div
			role="status"
			className="w-full rounded-md bg-amber-100 px-3 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100"
		>
			{text}
		</div>
	);
}
