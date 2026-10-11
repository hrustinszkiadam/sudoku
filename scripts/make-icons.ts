/**
 * Writes the brand mark and PWA icons to public/: nine tiles on Ink Blue, a
 * marigold centre and a friend's ring in the top-right corner. Rendered from
 * SVG with Playwright's Chromium. Run with `tsx scripts/make-icons.ts`.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const INK_BLUE = "#3453D3";
const MARIGOLD = "#F7AD30";
const RING = "#FF8F4B";

interface MarkOptions {
	/** Full-bleed square (maskable / Apple touch) instead of a rounded tile. */
	bleed?: boolean;
	/** Keep the tiles inside the 80 % safe circle of a maskable icon. */
	safe?: boolean;
	/** Favicon sizes: drop the ring and fatten the tiles so it still reads. */
	small?: boolean;
	title?: string;
}

/** The mark on a 32-unit grid: tiles 6 with 1.5 gaps, radius 7.5. */
function markSvg({ bleed, safe, small, title }: MarkOptions = {}): string {
	const tile = small ? 7.4 : 6;
	const gap = small ? 1.3 : 1.5;
	const block = 3 * tile + 2 * gap;
	const scale = safe ? (0.8 * 32) / Math.SQRT2 / block : 1;
	const start = (32 - block * scale) / 2;
	const rects: string[] = [];
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 3; c++) {
			const x = start + c * (tile + gap) * scale;
			const y = start + r * (tile + gap) * scale;
			const centre = r === 1 && c === 1;
			const ring = !small && r === 0 && c === 2;
			rects.push(
				`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(tile * scale).toFixed(2)}" height="${(tile * scale).toFixed(2)}" rx="${(1.6 * scale).toFixed(2)}" fill="${centre ? MARIGOLD : "#FFFFFF"}"${ring ? ` stroke="${RING}" stroke-width="${(1.6 * scale).toFixed(2)}"` : ""}/>`,
			);
		}
	}
	const attrs = title
		? ' role="img" aria-labelledby="t"'
		: ' aria-hidden="true"';
	const titleEl = title ? `\n\t<title id="t">${title}</title>` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${attrs}>${titleEl}
	<rect width="32" height="32"${bleed ? "" : ' rx="7.5"'} fill="${INK_BLUE}"/>
	${rects.join("\n\t")}
</svg>
`;
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	const entries: Buffer[] = [];
	let offset = 6 + 16 * images.length;
	for (const { size, data } of images) {
		const e = Buffer.alloc(16);
		e.writeUInt8(size >= 256 ? 0 : size, 0);
		e.writeUInt8(size >= 256 ? 0 : size, 1);
		e.writeUInt16LE(1, 4);
		e.writeUInt16LE(32, 6);
		e.writeUInt32LE(data.length, 8);
		e.writeUInt32LE(offset, 12);
		entries.push(e);
		offset += data.length;
	}
	return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function png(size: number, opts: MarkOptions): Promise<Buffer> {
	await page.setViewportSize({ width: size, height: size });
	await page.setContent(
		`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${markSvg(opts)}`,
	);
	return page.screenshot({ omitBackground: true });
}

writeFileSync("public/icon.svg", markSvg({ title: "Multiplayer Sudoku" }));
writeFileSync(
	"public/favicon.ico",
	ico([
		{ size: 16, data: await png(16, { small: true }) },
		{ size: 32, data: await png(32, {}) },
		{ size: 48, data: await png(48, {}) },
	]),
);
writeFileSync("public/icon-192.png", await png(192, {}));
writeFileSync("public/icon-512.png", await png(512, {}));
writeFileSync(
	"public/icon-maskable-512.png",
	await png(512, { bleed: true, safe: true }),
);
writeFileSync("public/apple-touch-icon.png", await png(180, { bleed: true }));
await browser.close();
console.log("Wrote icons to public/");
