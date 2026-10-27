import type { ReactNode } from "react";
import { usePageMeta } from "../meta";

const CONTACT = "adam@hrustinszki.com";

interface Processing {
	name: string;
	data: string;
	purpose: string;
	basis: string;
	retention: string;
}

const PROCESSING: Processing[] = [
	{
		name: "Guest identity",
		data: "A random user ID (UUID), the generated nickname or the one you chose, and the sid cookie.",
		purpose:
			"Running the game: recognising you in rooms and showing your own results.",
		basis:
			"GDPR Art. 6(1)(b): providing the service (performance of a contract).",
		retention:
			"The cookie lasts up to 1 year. The database record is kept until you ask for it to be deleted.",
	},
	{
		name: "Sign-in with GitHub or Google (optional)",
		data: "Name, email address, profile picture URL, the ID the provider uses for you and the tokens it issues, plus the IP address and browser identifier (user agent) of the session.",
		purpose: "Signing in, and keeping your results across devices.",
		basis: "GDPR Art. 6(1)(b): providing the service.",
		retention:
			"A session is valid for about 7 days. Account data is kept until you ask for it to be deleted.",
	},
	{
		name: "Game results and leaderboard",
		data: "Nickname and details of the games played: mode, difficulty, time, mistakes, rank.",
		purpose: "Showing your game history and the public leaderboard.",
		basis:
			"GDPR Art. 6(1)(b): providing the service; for the leaderboard, Art. 6(1)(f): legitimate interest.",
		retention: "Until you ask for it to be deleted.",
	},
	{
		name: "Game rooms",
		data: "User ID, nickname, pencil colour, moves made on the board, time joined.",
		purpose: "Real-time co-op or race play.",
		basis: "GDPR Art. 6(1)(b): providing the service.",
		retention:
			"Room data is deleted automatically after 24 hours of inactivity. The result is kept with the game results above.",
	},
	{
		name: "Abuse prevention",
		data: "IP address; browser characteristics during the Cloudflare Turnstile check.",
		purpose:
			"Rate limiting when new guest sessions and rooms are created, and filtering out bots.",
		basis: "GDPR Art. 6(1)(f): legitimate interest (the security of the Site).",
		retention:
			"The Site does not store the IP address; it is used only while the request is processed.",
	},
	{
		name: "Server logs",
		data: "Technical details of requests (time, URL, status code, internal user ID).",
		purpose: "Operating the Site and fixing bugs.",
		basis: "GDPR Art. 6(1)(f): legitimate interest.",
		retention: "According to Cloudflare's log retention (a few days).",
	},
	{
		name: "Visitor statistics",
		data: "Page viewed, referring page, browser, operating system, device type, country, load times.",
		purpose: "Aggregate visitor and performance statistics.",
		basis: "GDPR Art. 6(1)(f): legitimate interest.",
		retention:
			"Available only in aggregate in the Cloudflare dashboard; it cannot be linked to a person.",
	},
];

const STORAGE: [name: string, kind: string, purpose: string, life: string][] = [
	["sid", "Cookie", "Guest identity, signed", "1 year"],
	[
		"better-auth.session_token, better-auth.session_data",
		"Cookie",
		"Signed-in session (only after you sign in)",
		"about 7 days",
	],
	[
		"better-auth.* (other)",
		"Cookie",
		"Security state during GitHub/Google sign-in",
		"a few minutes",
	],
	[
		"__cf_bm, cf_clearance",
		"Cookie",
		"Cloudflare's security cookies, only when its protection requires them",
		"30 minutes – 1 year",
	],
	["sudoku:theme", "Local storage", "Light/dark theme", "until cleared"],
	["sudoku:sound", "Local storage", "Sound on/off", "until cleared"],
	[
		"sudoku:tip-seen",
		"Local storage",
		"Hides the onboarding tip",
		"until cleared",
	],
	[
		"sudoku:cookie-notice",
		"Local storage",
		"Hides the cookie notice",
		"until cleared",
	],
	[
		"sudoku:notes:<room code>",
		"Local storage",
		"Pencil notes in race mode",
		"until cleared",
	],
	[
		"sudoku:invited:<room code>",
		"Session storage",
		"Opens the invite sheet only once",
		"until the tab is closed",
	],
	[
		"sudoku-shell-v2",
		"Cache",
		"Keeps the app shell for offline use",
		"until a new version",
	],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">
				{title}
			</h2>
			{children}
		</section>
	);
}

function A({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			className="font-bold text-brand underline underline-offset-2 break-words"
		>
			{children}
		</a>
	);
}

const mail = <A href={`mailto:${CONTACT}`}>{CONTACT}</A>;

export function Privacy() {
	usePageMeta({
		title: "Privacy policy",
		description:
			"What personal data sudoku.hrustinszki.com handles, why and for how long, and what your rights are.",
		path: "/privacy",
	});
	return (
		<main className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-4 pt-7 pb-12 text-[16px] leading-relaxed text-ink-2 md:px-8 lg:pt-14 [&_strong]:text-ink">
			<div className="flex flex-col gap-2">
				<h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-ink lg:text-5xl">
					Privacy policy
				</h1>
				<p className="text-sm text-ink-3">Effective: 27 October 2026</p>
				<p className="mt-2 text-[17px]">
					This policy describes how <strong>sudoku.hrustinszki.com</strong> (the
					Site) handles your personal data. It is based on the EU General Data
					Protection Regulation (GDPR) and Hungary's Act CXII of 2011 on the
					Right of Informational Self-Determination and on Freedom of
					Information (Infotv.).
				</p>
			</div>

			<Section title="1. The controller">
				<p>
					<strong>Hrustinszki Ádám</strong>, private individual
					<br />
					Email: {mail}
					<br />
					Website:{" "}
					<A href="https://sudoku.hrustinszki.com">sudoku.hrustinszki.com</A>
				</p>
				<p>
					The controller is not required to appoint a data protection officer.
				</p>
			</Section>

			<Section title="2. What data we handle, why and for how long">
				<p>
					You can use the Site without registering. We do no profiling or
					automated decision-making, show no ads, and never sell your data.
				</p>
				<ul className="flex flex-col gap-3">
					{PROCESSING.map((p) => (
						<li key={p.name} className="rounded-lg bg-surface p-4 shadow-card">
							<h3 className="font-bold text-ink">{p.name}</h3>
							<dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[15px] sm:grid-cols-[9rem_1fr]">
								<dt className="font-bold text-ink-3">Data</dt>
								<dd>{p.data}</dd>
								<dt className="font-bold text-ink-3">Purpose</dt>
								<dd>{p.purpose}</dd>
								<dt className="font-bold text-ink-3">Legal basis</dt>
								<dd>{p.basis}</dd>
								<dt className="font-bold text-ink-3">Retention</dt>
								<dd>{p.retention}</dd>
							</dl>
						</li>
					))}
				</ul>
				<p>
					For processing based on legitimate interest, we have weighed that it
					is needed for the Site to run securely and reliably, and that it does
					not intrude disproportionately on your privacy.
				</p>
			</Section>

			<Section title="3. Cookies and local storage">
				<p>
					The Site only uses cookies and browser storage that are strictly
					necessary for it to work or that remember settings you chose. Under
					section 155(4) of Hungary's Act C of 2003 on Electronic
					Communications, these need no consent. The Site uses no statistics or
					advertising cookies.
				</p>
				<div className="overflow-x-auto rounded-lg bg-surface shadow-card">
					<table className="w-full min-w-[560px] text-left text-[14px]">
						<thead className="border-b border-hair text-ink">
							<tr>
								<th className="px-3 py-2">Name</th>
								<th className="px-3 py-2">Type</th>
								<th className="px-3 py-2">Purpose</th>
								<th className="px-3 py-2">Lifetime</th>
							</tr>
						</thead>
						<tbody>
							{STORAGE.map(([name, kind, purpose, life]) => (
								<tr key={name} className="border-b border-hair last:border-0">
									<td className="px-3 py-2 font-mono text-[13px] break-all text-ink">
										{name}
									</td>
									<td className="px-3 py-2">{kind}</td>
									<td className="px-3 py-2">{purpose}</td>
									<td className="px-3 py-2 whitespace-nowrap">{life}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p>
					You can delete cookies and stored data in your browser settings at any
					time. If you delete the sid cookie, the Site creates a new guest
					identity and your earlier results are no longer available.
				</p>
			</Section>

			<Section title="4. Web analytics">
				<p>
					We measure visits with <strong>Cloudflare Web Analytics</strong>. To
					do this, the Site loads a script from static.cloudflareinsights.com.
					The service uses no cookies, local storage or fingerprinting, does not
					follow you to other sites, and only shows aggregate data. Cloudflare
					sees your IP address to deliver the request but does not store it for
					the statistics.
				</p>
				<p>
					If you don't want your visit counted, you can block the script with a
					content blocker, or object by email.
				</p>
			</Section>

			<Section title="5. Processors and recipients">
				<ul className="flex list-disc flex-col gap-2 pl-5">
					<li>
						<strong>Cloudflare, Inc.</strong> (101 Townsend St, San Francisco,
						CA 94107, USA): hosting and server (Workers), database (D1), game
						rooms (Durable Objects), bot filtering (Turnstile), logging and web
						analytics.{" "}
						<A href="https://www.cloudflare.com/privacypolicy/">
							Privacy policy
						</A>
					</li>
					<li>
						<strong>GitHub</strong> and <strong>Google</strong>: only if you
						sign in with their account. During sign-in they act as independent
						controllers.{" "}
						<A href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
							GitHub privacy
						</A>
						, <A href="https://policies.google.com/privacy">Google privacy</A>
					</li>
				</ul>
				<p>
					Other players can see your nickname and results in game rooms, and
					anyone can see them on the leaderboard. Nobody else can see your email
					address.
				</p>
			</Section>

			<Section title="6. Transfers outside the EEA">
				<p>
					Cloudflare is a US company and runs servers worldwide. Transfers are
					made under the EU–US Data Privacy Framework and the European
					Commission's standard contractual clauses.
				</p>
			</Section>

			<Section title="7. Data security">
				<p>
					The Site is only available over an encrypted (HTTPS) connection.
					Session cookies are signed and cannot be read by JavaScript
					(HttpOnly). Only the controller has access to the database.
				</p>
			</Section>

			<Section title="8. Your rights">
				<p>Under Articles 15–21 of the GDPR, you can ask for:</p>
				<ul className="flex list-disc flex-col gap-1 pl-5">
					<li>access to your personal data and a copy of it;</li>
					<li>
						correction of your data (you can change your nickname yourself in
						the profile menu);
					</li>
					<li>deletion of your data;</li>
					<li>restriction of processing;</li>
					<li>your data in a machine-readable format;</li>
					<li>
						and you can object to processing based on legitimate interest.
					</li>
				</ul>
				<p>
					Send your request to {mail}. As a guest, include your nickname and, if
					you can, the code of a room you played in: without these we can't
					identify your data. We reply within one month at the latest. In
					justified cases this can be extended by two more months, and we will
					tell you if it is.
				</p>
			</Section>

			<Section title="9. Remedies">
				<p>
					If you feel we have violated your data protection rights, please write
					to us first. You can also lodge a complaint with the supervisory
					authority:
				</p>
				<p>
					<strong>
						Hungarian National Authority for Data Protection and Freedom of
						Information (NAIH)
					</strong>
					<br />
					Address: 1055 Budapest, Falk Miksa utca 9–11., Hungary
					<br />
					Postal address: 1363 Budapest, Pf. 9.
					<br />
					Phone: +36 1 391 1400
					<br />
					Email:{" "}
					<A href="mailto:ugyfelszolgalat@naih.hu">ugyfelszolgalat@naih.hu</A>
					<br />
					Website: <A href="https://naih.hu">naih.hu</A>
				</p>
				<p>
					You can also go to court (GDPR Art. 79, Infotv. section 23). The case
					falls under the jurisdiction of the regional court (törvényszék), and
					you can choose to bring it before the court of your place of residence
					or stay.
				</p>
			</Section>

			<Section title="10. Changes to this policy">
				<p>
					We update this policy when the Site changes. The current version is
					always on this page, with the date above. We will also note
					significant changes on the Site.
				</p>
			</Section>
		</main>
	);
}
