import { IconDownload } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { I } from "./ui";

/** Chrome/Edge/Android event fired when the PWA can be installed. */
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "Install app" button, shown only when the browser offers installation. */
export function InstallButton() {
	const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		const onPrompt = (e: Event) => {
			e.preventDefault();
			setEvent(e as BeforeInstallPromptEvent);
		};
		const onInstalled = () => setEvent(null);
		window.addEventListener("beforeinstallprompt", onPrompt);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onPrompt);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	if (!event) return null;
	return (
		<button
			type="button"
			aria-label="Install app"
			className="flex size-10 items-center justify-center gap-2 rounded-md text-[15px] font-bold text-ink-2 hover:bg-sunken hover:text-ink active:translate-y-px md:w-auto md:border md:border-line md:bg-surface md:px-3.5 md:text-ink"
			onClick={async () => {
				await event.prompt();
				await event.userChoice;
				setEvent(null);
			}}
		>
			<I icon={IconDownload} />
			<span className="hidden md:inline">Install app</span>
		</button>
	);
}
