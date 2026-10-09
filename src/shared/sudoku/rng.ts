/** A function returning a float in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast, seeded PRNG so generation is reproducible. */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Integer in [0, n). */
export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = randInt(rng, i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}
