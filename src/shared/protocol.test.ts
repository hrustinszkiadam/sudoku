import { describe, expect, it } from "vitest";
import {
	clientMessageSchema,
	parseClientMessage,
	serverMessageSchema,
} from "./protocol";

describe("client messages", () => {
	it("accepts every valid message type", () => {
		const valid = [
			{ type: "place", cell: 0, digit: 9 },
			{ type: "note", cell: 80, digit: 1 },
			{ type: "clear_notes", cell: 40 },
			{ type: "select", cell: 12 },
			{ type: "select", cell: null },
			{ type: "start" },
			{ type: "end" },
			{ type: "resync" },
		];
		for (const m of valid) expect(clientMessageSchema.parse(m)).toEqual(m);
	});

	it("rejects out-of-range, mistyped, unknown and padded messages", () => {
		const invalid = [
			{ type: "place", cell: 81, digit: 1 },
			{ type: "place", cell: -1, digit: 1 },
			{ type: "place", cell: 1.5, digit: 1 },
			{ type: "place", cell: 0, digit: 0 },
			{ type: "place", cell: 0, digit: 10 },
			{ type: "place", cell: "0", digit: 1 },
			{ type: "place", cell: 0 },
			{ type: "note", cell: 0, digit: 1, extra: true },
			{ type: "select" },
			{ type: "erase", cell: 0 },
			{ type: "start", solution: "x" },
			null,
			"place",
		];
		for (const m of invalid) {
			expect(clientMessageSchema.safeParse(m).success, JSON.stringify(m)).toBe(
				false,
			);
		}
	});

	it("parses raw frames", () => {
		expect(parseClientMessage('{"type":"resync"}')).toEqual({
			type: "resync",
		});
		expect(parseClientMessage("{nope")).toBeNull();
		expect(parseClientMessage('{"type":"nope"}')).toBeNull();
	});
});

describe("server messages", () => {
	it("validates a snapshot", () => {
		const snapshot = {
			type: "snapshot",
			version: 3,
			me: "u1",
			hostId: "u1",
			mode: "coop",
			difficulty: "easy",
			status: "playing",
			givens: "0".repeat(81),
			board: "0".repeat(81),
			notes: new Array(81).fill(0),
			players: [
				{
					userId: "u1",
					name: "Otter-1234",
					color: "#e11d48",
					connected: true,
					selected: null,
					placements: 0,
					mistakes: 0,
					filled: 0,
					finished: false,
				},
			],
			mistakes: 0,
			startsAt: null,
			startedAt: 1,
			finishedAt: null,
			results: null,
		};
		expect(serverMessageSchema.safeParse(snapshot).success).toBe(true);
		expect(
			serverMessageSchema.safeParse({ ...snapshot, mode: "solo" }).success,
		).toBe(false);
	});

	it("validates errors against the stable code list", () => {
		expect(
			serverMessageSchema.safeParse({
				type: "error",
				code: "rate_limited",
				message: "slow down",
			}).success,
		).toBe(true);
		expect(
			serverMessageSchema.safeParse({
				type: "error",
				code: "whatever",
				message: "",
			}).success,
		).toBe(false);
	});
});
