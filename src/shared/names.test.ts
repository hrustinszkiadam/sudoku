import { describe, expect, it } from "vitest";
import { isValidName, nameSchema, randomGuestName } from "./names";

describe("nameSchema", () => {
	it("trims and collapses whitespace", () => {
		expect(nameSchema.parse("  Ada   Lovelace ")).toBe("Ada Lovelace");
	});

	it("accepts unicode letters and emoji within 20 characters", () => {
		expect(isValidName("Zoë")).toBe(true);
		expect(isValidName("数独プレイヤー")).toBe(true);
		expect(isValidName("🐙".repeat(20))).toBe(true);
	});

	it("rejects empty, long, control-character and banned names", () => {
		expect(isValidName("   ")).toBe(false);
		expect(isValidName("x".repeat(21))).toBe(false);
		expect(isValidName("bad\u0000name")).toBe(false);
		expect(isValidName("zero​width")).toBe(false);
		expect(isValidName("Admin")).toBe(false);
		expect(isValidName("s.h.i.t")).toBe(false);
	});
});

describe("randomGuestName", () => {
	it("looks like Animal-1234 and is valid", () => {
		for (let i = 0; i < 20; i++) {
			const name = randomGuestName();
			expect(name).toMatch(/^[A-Z][a-z]+-\d{4}$/);
			expect(isValidName(name)).toBe(true);
		}
		expect(randomGuestName(() => 0)).toBe("Otter-1000");
	});
});
