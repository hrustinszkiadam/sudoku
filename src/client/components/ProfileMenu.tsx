import {
	IconAlertTriangle,
	IconCheck,
	IconDeviceDesktop,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { useSession } from "../store/session";
import { THEME_PREFS, type ThemePref, useTheme } from "../theme";
import { SignInButtons, SignOutButton, useAuthProviders } from "./Account";
import { SegmentedButtons } from "./Segmented";
import { btn, I } from "./ui";

export const field =
	"h-12 min-w-0 rounded-md border border-line bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-soft aria-invalid:border-danger";

/** Rename form, used in the profile menu and on Home. */
export function NicknameForm({
	autoFocus,
	onSaved,
}: {
	autoFocus?: boolean;
	onSaved?: () => void;
}) {
	const id = useId();
	const session = useSession((s) => s.session);
	const rename = useSession((s) => s.rename);
	const [name, setName] = useState("");
	const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);
	useEffect(() => setName(session?.name ?? ""), [session?.name]);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		const error = await rename(name);
		setBusy(false);
		setStatus(error ? { ok: false, text: error } : { ok: true, text: "Saved" });
		if (!error) onSaved?.();
	};

	return (
		<form className="flex flex-col gap-2" onSubmit={submit}>
			<label htmlFor={id} className="text-[15px] font-bold">
				Your nickname
			</label>
			<div className="flex gap-2">
				<input
					id={id}
					name="nickname"
					// biome-ignore lint/a11y/noAutofocus: opened on purpose by the user
					autoFocus={autoFocus}
					className={`${field} flex-1`}
					value={name}
					maxLength={40}
					autoComplete="nickname"
					spellCheck={false}
					aria-invalid={status?.ok === false}
					aria-describedby={`${id}-status`}
					onChange={(e) => {
						setName(e.target.value);
						setStatus(null);
					}}
				/>
				<button
					type="submit"
					className={`${btn.primary} ${btn.md} px-4 shadow-none`}
					disabled={!session || busy}
				>
					Save
				</button>
			</div>
			<p
				id={`${id}-status`}
				role="status"
				className={`flex min-h-5 items-center gap-1 text-[13px] font-bold ${status?.ok ? "text-success" : "text-danger"}`}
			>
				{status && (
					<I icon={status.ok ? IconCheck : IconAlertTriangle} size={16} />
				)}
				{status?.text}
			</p>
		</form>
	);
}

const THEME_LABEL = {
	light: { icon: IconSun, text: "Light" },
	dark: { icon: IconMoon, text: "Dark" },
	system: { icon: IconDeviceDesktop, text: "System" },
} as const satisfies Record<ThemePref, unknown>;

function ThemePicker() {
	const pref = useTheme((s) => s.pref);
	const setPref = useTheme((s) => s.setPref);
	return (
		<SegmentedButtons
			label="Theme"
			options={THEME_PREFS}
			value={pref}
			onChange={setPref}
			compact
			render={(p) => (
				<>
					<I icon={THEME_LABEL[p].icon} size={18} />
					{THEME_LABEL[p].text}
				</>
			)}
		/>
	);
}

/** Header dropdown: the full nickname, rename, theme and account. Native popover. */
export function ProfileMenu() {
	const session = useSession((s) => s.session);
	const providers = useAuthProviders();
	if (!session) return null;
	return (
		<div
			id="profile-menu"
			popover="auto"
			className="fixed inset-auto top-14 right-2 m-0 w-[min(340px,calc(100vw-16px))] rounded-xl bg-raised p-5 text-ink shadow-float md:top-[60px] md:right-[max(48px,calc((100vw-1280px)/2+48px))]"
		>
			<p className="mb-4 truncate font-display text-xl font-extrabold">
				{session.name}
			</p>
			<NicknameForm />
			<div className="mt-2 border-t border-hair pt-4">
				<ThemePicker />
			</div>
			<div className="mt-4 flex flex-col gap-3 border-t border-hair pt-4">
				{session.account ? (
					<>
						<p className="text-sm text-ink-2">
							Signed in as{" "}
							<strong className="text-ink">{session.account.email}</strong>
						</p>
						<SignOutButton className="self-start" />
					</>
				) : providers.length > 0 ? (
					<>
						<p className="text-sm text-ink-2">
							Sign in to keep your history across devices.
						</p>
						<SignInButtons providers={providers} />
					</>
				) : (
					<p className="text-sm text-ink-2">Playing as a guest.</p>
				)}
			</div>
			<Link
				to="/adatkezeles"
				onClick={() => document.getElementById("profile-menu")?.hidePopover()}
				className="mt-4 inline-block text-[13px] font-bold text-ink-3 underline underline-offset-2 hover:text-ink"
			>
				Privacy policy (HU)
			</Link>
		</div>
	);
}
