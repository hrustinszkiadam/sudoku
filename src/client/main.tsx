import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "./theme";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Installability is a nice-to-have; the app works without it.
		});
	});
}
