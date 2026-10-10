import { useEffect, useState } from "react";

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
			className="rounded-md border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-600"
			onClick={async () => {
				await event.prompt();
				await event.userChoice;
				setEvent(null);
			}}
		>
			Install app
		</button>
	);
}
