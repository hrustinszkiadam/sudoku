import { Link } from "react-router";
import { StatePanel } from "../components/States";
import { btn } from "../components/ui";
import { usePageMeta } from "../meta";

export function NotFound() {
	usePageMeta({ title: "Page not found", noindex: true });
	return (
		<StatePanel
			mood="lost"
			title="Page not found."
			actions={
				<Link to="/" className={`${btn.primary} ${btn.md}`}>
					Back home
				</Link>
			}
		/>
	);
}
