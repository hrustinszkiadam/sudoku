/**
 * Renders the social share image (public/og-image.png, 1200x630) from an HTML
 * template with Playwright's Chromium. Run with `tsx scripts/make-og-image.ts`.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icon = readFileSync("public/icon-512.png").toString("base64");

const html = `<!doctype html>
<html><head><style>
	* { margin: 0; box-sizing: border-box; }
	body {
		width: 1200px; height: 630px; display: flex; align-items: center; gap: 64px;
		padding: 0 88px; color: #fff;
		font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		background: radial-gradient(circle at 80% 20%, #0ea5e9 0%, #0369a1 55%, #0c4a6e 100%);
	}
	img { width: 340px; height: 340px; border-radius: 64px; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
	h1 { font-size: 84px; line-height: 1; font-weight: 800; letter-spacing: -2px; }
	p { font-size: 34px; margin-top: 24px; opacity: .92; line-height: 1.3; }
	.tags { display: flex; gap: 14px; margin-top: 36px; }
	.tags span { font-size: 26px; font-weight: 600; padding: 10px 22px; border-radius: 999px; background: rgba(255,255,255,.18); }
	.url { font-size: 24px; margin-top: 40px; opacity: .75; }
</style></head><body>
	<img src="data:image/png;base64,${icon}" alt="" />
	<div>
		<h1>Multiplayer<br />Sudoku</h1>
		<p>Solve together or race your friends, live.</p>
		<div class="tags"><span>Co-op</span><span>Race</span><span>Daily puzzle</span></div>
		<div class="url">sudoku.hrustinszki.com</div>
	</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
console.log("Wrote public/og-image.png");
