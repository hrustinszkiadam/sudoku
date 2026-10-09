import { z } from "zod";
import { NAME_MAX_LENGTH } from "./constants";

/** Small, deliberately conservative list; matched case-insensitively as substrings. */
const BANNED = [
	"admin",
	"moderator",
	"nigger",
	"nigga",
	"faggot",
	"retard",
	"cunt",
	"fuck",
	"shit",
	"nazi",
	"hitler",
];

const ANIMALS = [
	"Otter",
	"Badger",
	"Falcon",
	"Panda",
	"Lynx",
	"Heron",
	"Koala",
	"Gecko",
	"Bison",
	"Marten",
	"Puffin",
	"Walrus",
	"Ibis",
	"Yak",
	"Tapir",
	"Quokka",
];

/** Collapses whitespace runs and trims. */
const tidy = (s: string) => s.replace(/\s+/gu, " ").trim();

/**
 * Nickname: 1-20 characters after trimming, printable only (no control,
 * format or private-use characters), not containing a banned word.
 */
export const nameSchema = z
	.string()
	.transform(tidy)
	.pipe(
		z
			.string()
			.min(1, "Name is required")
			.refine((s) => [...s].length <= NAME_MAX_LENGTH, {
				message: `At most ${NAME_MAX_LENGTH} characters`,
			})
			.refine((s) => !/\p{C}/u.test(s), {
				message: "Only printable characters",
			})
			.refine(
				(s) => {
					const lower = s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
					return !BANNED.some((w) => lower.includes(w));
				},
				{ message: "Please pick another name" },
			),
	);

export const isValidName = (name: string): boolean =>
	nameSchema.safeParse(name).success;

/** e.g. "Otter-4821". `rand` returns floats in [0, 1). */
export function randomGuestName(rand: () => number = Math.random): string {
	const animal = ANIMALS[Math.floor(rand() * ANIMALS.length)];
	const n = 1000 + Math.floor(rand() * 9000);
	return `${animal}-${n}`;
}
