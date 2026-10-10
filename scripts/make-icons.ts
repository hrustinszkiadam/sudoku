/**
 * Writes the PWA icons to public/: a sudoku grid on a blue rounded square.
 * Dependency-free PNG encoding (node:zlib). Run with `tsx scripts/make-icons.ts`.
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [2, 132, 199]; // sky-600
const FG = [255, 255, 255];
const ACCENT = [251, 191, 36]; // amber-400

function crc32(buf: Buffer): number {
	let c = ~0;
	for (const b of buf) {
		c ^= b;
		for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
	}
	return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

/** `pixel(x, y)` returns RGBA in 0-255. */
function png(size: number, pixel: (x: number, y: number) => number[]): Buffer {
	const raw = Buffer.alloc(size * (size * 4 + 1));
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			const [r, g, b, a] = pixel(x, y);
			raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr.set([8, 6, 0, 0, 0], 8);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw)),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

/** Grid icon; `maskable` keeps the art inside the 80% safe zone on a full bleed. */
function icon(size: number, maskable: boolean): Buffer {
	const radius = maskable ? 0 : size * 0.18;
	const inset = size * (maskable ? 0.2 : 0.16);
	const grid = size - 2 * inset;
	const cell = grid / 9;
	const thin = Math.max(1, size / 160);
	const thick = Math.max(2, size / 48);
	return png(size, (x, y) => {
		// Rounded-square mask.
		const cx = Math.min(Math.max(x, radius), size - 1 - radius);
		const cy = Math.min(Math.max(y, radius), size - 1 - radius);
		if (Math.hypot(x - cx, y - cy) > radius) return [0, 0, 0, 0];

		const gx = x - inset;
		const gy = y - inset;
		if (gx < 0 || gy < 0 || gx > grid || gy > grid) return [...BG, 255];
		const col = Math.floor(gx / cell);
		const row = Math.floor(gy / cell);
		const onLine = (v: number) => {
			const i = Math.round(v / cell);
			const d = Math.abs(v - i * cell);
			return d <= (i % 3 === 0 ? thick : thin) / 2;
		};
		if (onLine(gx) || onLine(gy)) return [...FG, 255];
		// A highlighted cell and its box hint at play.
		if (row === 4 && col === 4) return [...ACCENT, 255];
		if (Math.floor(row / 3) === 1 && Math.floor(col / 3) === 1) {
			return [...FG.map((c, i) => Math.round(c * 0.25 + BG[i] * 0.75)), 255];
		}
		return [...BG, 255];
	});
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

writeFileSync(
	"public/favicon.ico",
	ico([16, 32, 48].map((size) => ({ size, data: icon(size, false) }))),
);
writeFileSync("public/icon-192.png", icon(192, false));
writeFileSync("public/icon-512.png", icon(512, false));
writeFileSync("public/icon-maskable-512.png", icon(512, true));
writeFileSync("public/apple-touch-icon.png", icon(180, true));
console.log("Wrote icons to public/");
