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
		name: "Vendégazonosító",
		data: "Véletlenszerű felhasználói azonosító (UUID), a generált vagy Ön által megadott becenév, a sid süti.",
		purpose:
			"A játék működtetése: hogy az Oldal felismerje Önt a szobákban és a saját eredményeinél.",
		basis:
			"GDPR 6. cikk (1) b) – a szolgáltatás nyújtása (szerződés teljesítése).",
		retention:
			"A süti legfeljebb 1 évig él. Az adatbázis-bejegyzést törlési kérelemig őrizzük.",
	},
	{
		name: "Bejelentkezés GitHub- vagy Google-fiókkal (opcionális)",
		data: "Név, e-mail-cím, profilkép URL-je, a szolgáltatónál használt azonosító és az általa kiadott tokenek, valamint a munkamenethez tartozó IP-cím és böngészőazonosító (user agent).",
		purpose:
			"Bejelentkezés, és hogy az eredményei több eszközön is megmaradjanak.",
		basis: "GDPR 6. cikk (1) b) – a szolgáltatás nyújtása.",
		retention:
			"A munkamenet kb. 7 napig érvényes. A fiókadatokat törlési kérelemig őrizzük.",
	},
	{
		name: "Játékeredmények és ranglista",
		data: "Becenév, a lejátszott játékok adatai: mód, nehézség, idő, hibák, helyezés.",
		purpose: "Játékelőzmények megjelenítése és a nyilvános ranglista.",
		basis:
			"GDPR 6. cikk (1) b) – a szolgáltatás nyújtása; a ranglistán való megjelenítésnél 6. cikk (1) f) – jogos érdek.",
		retention: "Törlési kérelemig.",
	},
	{
		name: "Játékszobák",
		data: "Felhasználói azonosító, becenév, ceruzaszín, a táblára tett lépések, csatlakozási idő.",
		purpose: "Valós idejű közös vagy versenyjáték.",
		basis: "GDPR 6. cikk (1) b) – a szolgáltatás nyújtása.",
		retention:
			"A szoba adatai 24 óra inaktivitás után automatikusan törlődnek. Az eredmény a fenti játékeredmények között marad meg.",
	},
	{
		name: "Visszaélések megelőzése",
		data: "IP-cím; a Cloudflare Turnstile ellenőrzés során böngészőjellemzők.",
		purpose:
			"Kéréskorlátozás új vendégmunkamenetek és szobák létrehozásánál, robotok kiszűrése.",
		basis: "GDPR 6. cikk (1) f) – jogos érdek (az Oldal biztonsága).",
		retention:
			"Az IP-címet az Oldal nem tárolja, csak a kérés feldolgozásáig használja.",
	},
	{
		name: "Szervernaplók",
		data: "A kérések technikai adatai (időpont, URL, válaszkód, belső felhasználói azonosító).",
		purpose: "Üzemeltetés, hibakeresés.",
		basis: "GDPR 6. cikk (1) f) – jogos érdek.",
		retention: "A Cloudflare naplómegőrzési ideje szerint (néhány nap).",
	},
	{
		name: "Látogatottsági statisztika",
		data: "Megtekintett oldal, hivatkozó oldal, böngésző, operációs rendszer, eszköztípus, ország, betöltési idők.",
		purpose: "Összesített látogatottsági és teljesítménystatisztika.",
		basis: "GDPR 6. cikk (1) f) – jogos érdek.",
		retention:
			"Csak összesített formában, a Cloudflare irányítópultján érhető el; személyhez nem köthető.",
	},
];

const STORAGE: [name: string, kind: string, purpose: string, life: string][] = [
	["sid", "Süti", "Vendégazonosító, aláírva", "1 év"],
	[
		"better-auth.session_token, better-auth.session_data",
		"Süti",
		"Bejelentkezett munkamenet (csak bejelentkezés után)",
		"kb. 7 nap",
	],
	[
		"better-auth.* (egyéb)",
		"Süti",
		"A GitHub/Google bejelentkezés közbeni biztonsági állapot",
		"néhány perc",
	],
	[
		"__cf_bm, cf_clearance",
		"Süti",
		"A Cloudflare biztonsági sütijei, csak ha a védelem szükségessé teszi",
		"30 perc – 1 év",
	],
	["sudoku:theme", "Helyi tárolás", "Világos/sötét téma", "törlésig"],
	["sudoku:sound", "Helyi tárolás", "Hang be/ki", "törlésig"],
	["sudoku:tip-seen", "Helyi tárolás", "A bemutató tipp elrejtése", "törlésig"],
	[
		"sudoku:cookie-notice",
		"Helyi tárolás",
		"A sütikről szóló tájékoztatás elrejtése",
		"törlésig",
	],
	[
		"sudoku:notes:<szobakód>",
		"Helyi tárolás",
		"Ceruzajegyzetek versenymódban",
		"törlésig",
	],
	[
		"sudoku:invited:<szobakód>",
		"Munkamenet-tárolás",
		"A meghívó ablak csak egyszer nyíljon meg",
		"a lap bezárásáig",
	],
	[
		"sudoku-shell-v2",
		"Gyorsítótár",
		"Az alkalmazás vázának offline tárolása",
		"új verzióig",
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

export function Adatkezeles() {
	usePageMeta({
		title: "Adatkezelési tájékoztató",
		description:
			"Milyen személyes adatokat kezel a sudoku.hrustinszki.com, milyen célból és meddig, és milyen jogai vannak.",
		path: "/adatkezeles",
	});
	return (
		<main
			lang="hu"
			className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-4 pt-7 pb-12 text-[16px] leading-relaxed text-ink-2 md:px-8 lg:pt-14 [&_strong]:text-ink"
		>
			<div className="flex flex-col gap-2">
				<h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-ink lg:text-5xl">
					Adatkezelési tájékoztató
				</h1>
				<p className="text-sm text-ink-3">Hatályos: 2026. október 24.</p>
				<p className="mt-2 text-[17px]">
					Ez a tájékoztató leírja, hogyan kezeli a{" "}
					<strong>sudoku.hrustinszki.com</strong> (a továbbiakban: Oldal) a
					személyes adatait. Az alapjai az Európai Unió általános adatvédelmi
					rendelete (GDPR) és az információs önrendelkezési jogról szóló 2011.
					évi CXII. törvény (Infotv.).
				</p>
			</div>

			<Section title="1. Az adatkezelő">
				<p>
					<strong>Hrustinszki Ádám</strong>, magánszemély
					<br />
					E-mail: {mail}
					<br />
					Weboldal:{" "}
					<A href="https://sudoku.hrustinszki.com">sudoku.hrustinszki.com</A>
				</p>
				<p>Adatvédelmi tisztviselő kijelölésére nem kötelezett.</p>
			</Section>

			<Section title="2. Milyen adatokat kezelünk, miért és meddig">
				<p>
					Az Oldal regisztráció nélkül használható. Profilalkotást és
					automatizált döntéshozatalt nem végzünk, hirdetéseket nem jelenítünk
					meg, és az adatokat nem adjuk el.
				</p>
				<ul className="flex flex-col gap-3">
					{PROCESSING.map((p) => (
						<li key={p.name} className="rounded-lg bg-surface p-4 shadow-card">
							<h3 className="font-bold text-ink">{p.name}</h3>
							<dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[15px] sm:grid-cols-[9rem_1fr]">
								<dt className="font-bold text-ink-3">Adatok</dt>
								<dd>{p.data}</dd>
								<dt className="font-bold text-ink-3">Cél</dt>
								<dd>{p.purpose}</dd>
								<dt className="font-bold text-ink-3">Jogalap</dt>
								<dd>{p.basis}</dd>
								<dt className="font-bold text-ink-3">Időtartam</dt>
								<dd>{p.retention}</dd>
							</dl>
						</li>
					))}
				</ul>
				<p>
					Jogos érdeken alapuló adatkezelésnél mérlegeltük, hogy az adatkezelés
					szükséges az Oldal biztonságos és megbízható működéséhez, és nem
					jelent aránytalan beavatkozást az Ön magánszférájába.
				</p>
			</Section>

			<Section title="3. Sütik és helyi tárolás">
				<p>
					Az Oldal kizárólag olyan sütiket és böngészőtárolást használ, amelyek
					a működéséhez feltétlenül szükségesek, vagy az Ön által választott
					beállításokat őrzik. Ezekhez az elektronikus hírközlésről szóló 2003.
					évi C. törvény 155. § (4) bekezdése szerint nem kell hozzájárulás.
					Statisztikai vagy hirdetési sütit az Oldal nem használ.
				</p>
				<div className="overflow-x-auto rounded-lg bg-surface shadow-card">
					<table className="w-full min-w-[560px] text-left text-[14px]">
						<thead className="border-b border-hair text-ink">
							<tr>
								<th className="px-3 py-2">Név</th>
								<th className="px-3 py-2">Típus</th>
								<th className="px-3 py-2">Cél</th>
								<th className="px-3 py-2">Élettartam</th>
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
					A sütiket és a tárolt adatokat a böngésző beállításaiban bármikor
					törölheti. A sid süti törlése után az Oldal új vendégazonosítót hoz
					létre, a korábbi eredményei pedig nem lesznek elérhetők.
				</p>
			</Section>

			<Section title="4. Webanalitika">
				<p>
					A látogatottságot a <strong>Cloudflare Web Analytics</strong>{" "}
					szolgáltatással mérjük. Ehhez az Oldal betölt egy szkriptet a
					static.cloudflareinsights.com címről. A szolgáltatás nem használ
					sütit, helyi tárolást vagy ujjlenyomat-alapú azonosítást, nem követi
					Önt más oldalakon, és csak összesített adatokat mutat. Az IP-címét a
					Cloudflare a kérés továbbításához látja, de a statisztikához nem
					tárolja.
				</p>
				<p>
					Ha nem szeretné, hogy a látogatását beszámítsuk, letilthatja a
					szkriptet tartalomblokkolóval, vagy tiltakozhat e-mailben.
				</p>
			</Section>

			<Section title="5. Adatfeldolgozók és címzettek">
				<ul className="flex list-disc flex-col gap-2 pl-5">
					<li>
						<strong>Cloudflare, Inc.</strong> (101 Townsend St, San Francisco,
						CA 94107, USA): tárhely és szerver (Workers), adatbázis (D1),
						játékszobák (Durable Objects), robotszűrés (Turnstile), naplózás és
						webanalitika.{" "}
						<A href="https://www.cloudflare.com/privacypolicy/">
							Adatvédelmi irányelvek
						</A>
					</li>
					<li>
						<strong>GitHub</strong> és <strong>Google</strong>: csak ha Ön az ő
						fiókjukkal jelentkezik be. A bejelentkezés során önálló
						adatkezelőként járnak el.{" "}
						<A href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
							GitHub adatvédelem
						</A>
						,{" "}
						<A href="https://policies.google.com/privacy">Google adatvédelem</A>
					</li>
				</ul>
				<p>
					A ranglistán és a játékszobákban a becenevét és az eredményeit a többi
					játékos, illetve a ranglistán bárki láthatja. Az e-mail-címét senki
					más nem látja.
				</p>
			</Section>

			<Section title="6. Adattovábbítás az EGT-n kívülre">
				<p>
					A Cloudflare egyesült államokbeli vállalat, és világszerte működtet
					szervereket. Az adattovábbítás az EU–USA adatvédelmi keretrendszer
					(Data Privacy Framework), illetve az Európai Bizottság általános
					szerződési feltételei alapján történik.
				</p>
			</Section>

			<Section title="7. Adatbiztonság">
				<p>
					Az Oldal kizárólag titkosított (HTTPS) kapcsolaton érhető el. A
					munkamenet-sütik aláírtak, és JavaScriptből nem olvashatók (HttpOnly).
					Az adatbázishoz csak az adatkezelő fér hozzá.
				</p>
			</Section>

			<Section title="8. Az Ön jogai">
				<p>A GDPR 15–21. cikke alapján Ön kérheti:</p>
				<ul className="flex list-disc flex-col gap-1 pl-5">
					<li>a személyes adataihoz való hozzáférést és másolatot;</li>
					<li>
						az adatai helyesbítését (a becenevét a profilmenüben maga is
						módosíthatja);
					</li>
					<li>az adatai törlését;</li>
					<li>az adatkezelés korlátozását;</li>
					<li>az adatai géppel olvasható formában való kiadását;</li>
					<li>és tiltakozhat a jogos érdeken alapuló adatkezelés ellen.</li>
				</ul>
				<p>
					Kérelmét a {mail} címre küldheti. Vendégként adja meg a becenevét, és
					ha lehet, egy szoba kódját, amelyben játszott: enélkül nem tudjuk
					azonosítani az adatait. A kérelemre legkésőbb egy hónapon belül
					válaszolunk. Ez indokolt esetben további két hónappal
					meghosszabbodhat, amiről tájékoztatjuk.
				</p>
			</Section>

			<Section title="9. Jogorvoslat">
				<p>
					Ha úgy érzi, hogy megsértettük az adatvédelmi jogait, kérjük, először
					írjon nekünk. Panaszt tehet a felügyeleti hatóságnál is:
				</p>
				<p>
					<strong>
						Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)
					</strong>
					<br />
					Székhely: 1055 Budapest, Falk Miksa utca 9–11.
					<br />
					Postacím: 1363 Budapest, Pf. 9.
					<br />
					Telefon: +36 1 391 1400
					<br />
					E-mail:{" "}
					<A href="mailto:ugyfelszolgalat@naih.hu">ugyfelszolgalat@naih.hu</A>
					<br />
					Weboldal: <A href="https://naih.hu">naih.hu</A>
				</p>
				<p>
					Bírósághoz is fordulhat (GDPR 79. cikk, Infotv. 23. §). A per a
					törvényszék hatáskörébe tartozik, és választása szerint a lakóhelye
					vagy tartózkodási helye szerinti törvényszék előtt is megindíthatja.
				</p>
			</Section>

			<Section title="10. A tájékoztató módosítása">
				<p>
					A tájékoztatót az Oldal változásakor frissítjük. A hatályos változat
					mindig ezen az oldalon érhető el, a fenti dátummal. Lényeges változás
					esetén az Oldalon is jelezzük.
				</p>
			</Section>
		</main>
	);
}
