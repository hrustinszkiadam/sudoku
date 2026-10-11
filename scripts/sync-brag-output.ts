/**
 * Copies the latest /brag launch video and its poster into marketing/.
 * Run with `pnpm sync:brag-output`.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const FROM = "brag-output";
const TO = "marketing";
const FILES: [string, string][] = [
	["brag.mp4", "launch-video.mp4"],
	["brag.jpg", "launch-video-poster.jpg"],
];

mkdirSync(TO, { recursive: true });
for (const [src, dest] of FILES) {
	const from = `${FROM}/${src}`;
	if (!existsSync(from)) {
		console.error(`Missing ${from}. Run /brag first.`);
		process.exit(1);
	}
	copyFileSync(from, `${TO}/${dest}`);
	console.log(`${from} -> ${TO}/${dest}`);
}
