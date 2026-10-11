import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../types";
import { I } from "./ui";

const TEXT: Partial<Record<ConnectionStatus, string>> = {
	connecting: "Connecting…",
	reconnecting: "Reconnecting…",
	replaced: "This room is open in another tab. Reload to play here.",
};

/** Waits this long before showing, so brief blips never flash a banner. */
const SHOW_AFTER_MS = 400;

/** Full-width strip under the header; pushes content down instead of covering the board. */
export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
	const text = TEXT[status];
	const terminal = status === "replaced";
	const [visible, setVisible] = useState(terminal);
	useEffect(() => {
		if (!text) {
			setVisible(false);
			return;
		}
		if (terminal) {
			setVisible(true);
			return;
		}
		const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
		return () => clearTimeout(id);
	}, [text, terminal]);

	return (
		<div role="status">
			{text && visible && (
				<div className="banner-in border-b border-warn-line bg-warn text-warn-ink">
					<div className="mx-auto flex min-h-11 max-w-[1280px] items-center gap-2.5 px-4 py-2.5 text-sm font-bold md:px-12">
						<I
							icon={terminal ? IconAlertTriangle : IconRefresh}
							size={18}
							className={terminal ? "" : "spin-slow"}
						/>
						<span className="min-w-0 flex-1">{text}</span>
						{terminal && (
							<button
								type="button"
								onClick={() => location.reload()}
								className="h-8 shrink-0 rounded-sm border border-warn-ink/60 px-3 text-[13px] font-extrabold hover:bg-warn-ink/10"
							>
								Reload
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
