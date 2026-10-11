/**
 * Renders the social share image (public/og-image.png, 1200x630) from an HTML
 * template with Playwright's Chromium, using the app's own fonts.
 * Run with `tsx scripts/make-og-image.ts`.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const font = (pkg: string, file: string) =>
	readFileSync(
		`node_modules/@fontsource-variable/${pkg}/files/${file}`,
	).toString("base64");
const display = font(
	"bricolage-grotesque",
	"bricolage-grotesque-latin-opsz-normal.woff2",
);
const sans = font(
	"atkinson-hyperlegible-next",
	"atkinson-hyperlegible-next-latin-wght-normal.woff2",
);

// A corner of a real puzzle: givens in ink, a few answers in pen, three friends.
const PUZ =
	"000902480000748010004300002038070205905000104107050830300004600060527000059106000";
const SOL =
	"513962487296748513784315962638471295925683174147259836372894651861527349459136728";
const PEN = new Set([1, 2, 9, 10, 30, 32, 39, 40, 41, 48, 18]);
const RINGS: Record<number, [string, string, string]> = {
	19: ["#D86500", "#151D33", "K"],
	49: ["#6213AB", "#FFFFFF", "Z"],
	22: ["#0178A8", "#FFFFFF", "O"],
};

let cells = "";
for (let r = 0; r < 7; r++) {
	for (let c = 0; c < 6; c++) {
		const i = r * 9 + c;
		const given = PUZ[i] !== "0";
		const digit = given ? PUZ[i] : PEN.has(i) ? SOL[i] : "";
		const sel = i === 31;
		const ring = RINGS[i];
		const right =
			c === 5 ? "0" : c === 2 ? "3px solid #2A344F" : "1px solid #D2D7E4";
		const bottom =
			r === 6
				? "0"
				: r === 2 || r === 5
					? "3px solid #2A344F"
					: "1px solid #D2D7E4";
		const bg = sel ? "#C5D5FE" : r === 3 || c === 4 ? "#EFF2F9" : "#FFFFFF";
		const shadow = sel
			? "inset 0 0 0 3px #3453D3"
			: ring
				? `inset 0 0 0 4px ${ring[0]}, inset 0 0 0 6px #FFFFFF`
				: "none";
		cells += `<span class="cell" style="border-right:${right};border-bottom:${bottom};background:${bg};box-shadow:${shadow}">
			<span style="font-weight:${given ? 800 : 600};color:${given ? "#151D33" : "#2841B9"}">${digit}</span>
			${ring ? `<span class="tag" style="background:${ring[0]};color:${ring[1]}">${ring[2]}</span>` : ""}
		</span>`;
	}
}

const tiles = [5.5, 13, 20.5]
	.flatMap((y) => [5.5, 13, 20.5].map((x) => [x, y]))
	.map(
		([x, y]) =>
			`<rect x="${x}" y="${y}" width="6" height="6" rx="1.6" fill="${x === 13 && y === 13 ? "#F7AD30" : "#3453D3"}"${x === 20.5 && y === 5.5 ? ' stroke="#D86500" stroke-width="1.6"' : ""}/>`,
	)
	.join("");

const html = `<!doctype html>
<html><head><style>
	@font-face { font-family: Display; src: url(data:font/woff2;base64,${display}) format("woff2"); font-weight: 200 800; }
	@font-face { font-family: Sans; src: url(data:font/woff2;base64,${sans}) format("woff2"); font-weight: 200 800; }
	* { margin: 0; box-sizing: border-box; }
	body { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #3453D3; color: #fff; font-family: Sans, sans-serif; }
	.left { position: absolute; left: 80px; top: 72px; bottom: 72px; width: 560px; display: flex; flex-direction: column; justify-content: space-between; }
	.brand { display: flex; align-items: center; gap: 16px; font-family: Display; font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
	h1 { font-family: Display; font-size: 84px; line-height: 0.92; font-weight: 800; letter-spacing: -0.04em; }
	p { margin-top: 22px; font-size: 30px; line-height: 1.3; color: #DEE8FF; }
	.tags { display: flex; gap: 10px; }
	.tags span { display: inline-flex; align-items: center; height: 44px; padding: 0 18px; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 20px; font-weight: 700; }
	.tags .daily { background: #F7AD30; color: #151D33; font-weight: 800; }
	.board { position: absolute; left: 700px; top: 60px; rotate: -6deg; padding: 18px; border-radius: 28px; background: #fff; box-shadow: 0 40px 80px -20px rgba(9,14,27,.6); }
	.grid { display: grid; grid-template-columns: repeat(6, 70px); grid-template-rows: repeat(7, 70px); border: 3px solid #2A344F; border-radius: 12px; overflow: hidden; }
	.cell { position: relative; display: flex; align-items: center; justify-content: center; font-size: 36px; }
	.tag { position: absolute; top: 4px; right: 4px; min-width: 18px; height: 18px; border-radius: 5px; font-size: 12px; line-height: 18px; font-weight: 800; text-align: center; }
</style></head><body>
	<div class="left">
		<div class="brand">
			<svg width="64" height="64" viewBox="0 0 32 32"><rect width="32" height="32" rx="7.5" fill="#fff"/>${tiles}</svg>
			Sudoku
		</div>
		<div><h1>Multiplayer Sudoku</h1><p>Solve together or race your friends, live.</p></div>
		<div class="tags"><span>Co-op</span><span>Race</span><span class="daily">Daily puzzle</span></div>
	</div>
	<div class="board"><div class="grid">${cells}</div></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
console.log("Wrote public/og-image.png");
