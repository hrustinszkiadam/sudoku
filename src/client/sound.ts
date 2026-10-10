import { create } from "zustand";

export type SoundKind = "place" | "mistake" | "win";

const KEY = "sudoku:sound";

/** Short synthesized tones: [frequency Hz, duration s] steps. */
const TONES: Record<SoundKind, [number, number][]> = {
	place: [[660, 0.06]],
	mistake: [
		[220, 0.09],
		[180, 0.12],
	],
	win: [
		[523, 0.1],
		[659, 0.1],
		[784, 0.18],
	],
};

let ctx: AudioContext | null = null;

function readEnabled(): boolean {
	try {
		return localStorage.getItem(KEY) !== "off";
	} catch {
		return true;
	}
}

interface SoundState {
	enabled: boolean;
	toggle: () => void;
}

/** Sound on/off, remembered per browser. */
export const useSound = create<SoundState>((set, get) => ({
	enabled: readEnabled(),
	toggle() {
		const enabled = !get().enabled;
		try {
			localStorage.setItem(KEY, enabled ? "on" : "off");
		} catch {
			// Not persisted; still toggles for this session.
		}
		set({ enabled });
		if (enabled) play("place");
	},
}));

export function play(kind: SoundKind): void {
	if (!useSound.getState().enabled || typeof AudioContext === "undefined") {
		return;
	}
	ctx ??= new AudioContext();
	if (ctx.state === "suspended") void ctx.resume();
	let at = ctx.currentTime;
	for (const [freq, dur] of TONES[kind]) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		osc.connect(gain).connect(ctx.destination);
		osc.start(at);
		osc.stop(at + dur + 0.02);
		at += dur;
	}
}
