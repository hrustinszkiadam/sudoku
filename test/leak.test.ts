import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { ServerMessage } from "../src/shared/protocol";
import {
	closeAllSockets,
	connect,
	createRoomFor,
	mockTurnstile,
	NEARLY,
	newGuest,
	seedPuzzles,
	type TestSocket,
} from "./helpers";

beforeAll(seedPuzzles);
beforeEach(() => {
	mockTurnstile();
});
afterEach(async () => {
	vi.restoreAllMocks();
	await closeAllSockets();
});

/**
 * Every frame a client received, except a co-op board that players completed
 * themselves (a finished board is, by definition, the solution).
 */
function frames(sockets: TestSocket[]): string[] {
	return sockets.flatMap((s) =>
		s.received.map((m: ServerMessage) =>
			JSON.stringify(
				m.type === "snapshot" && m.status === "finished"
					? { ...m, board: "<completed by players>" }
					: m,
			),
		),
	);
}

function expectNoSolution(sockets: TestSocket[], solution: string) {
	for (const frame of frames(sockets)) {
		expect(frame).not.toContain(solution);
		expect(frame).not.toContain('"solution"');
	}
}

describe("the solution never leaves the server", () => {
	it("in any co-op message type", async () => {
		const host = await newGuest();
		const friend = await newGuest();
		const code = await createRoomFor(host, { difficulty: "expert" });
		const a = await connect(code, host);
		await a.next("snapshot");
		const b = await connect(code, friend);
		await b.next("snapshot");
		await a.next("player_joined");

		const right = (cell: number) => Number(NEARLY.solution[cell]);
		a.send({ type: "select", cell: 0 });
		await b.next("presence");
		a.send({ type: "note", cell: 0, digit: 9 });
		await b.next("notes");
		a.send({ type: "place", cell: 0, digit: right(0) === 1 ? 2 : 1 });
		await b.next("mistake");
		a.send({ type: "place", cell: 5, digit: 1 });
		await a.next("error");
		a.send({ type: "resync" });
		await a.next("snapshot");

		const c = await connect(code, await newGuest());
		await c.next("snapshot");
		await c.close();
		await a.next("player_left");

		for (const cell of [0, 1, 2])
			a.send({ type: "place", cell, digit: right(cell) });
		await a.next("game_over");
		await b.next("game_over");
		b.send({ type: "resync" });
		await b.next("snapshot");

		const seen = new Set(a.received.concat(b.received).map((m) => m.type));
		for (const type of [
			"snapshot",
			"applied",
			"mistake",
			"notes",
			"presence",
			"player_joined",
			"player_left",
			"error",
			"game_over",
		]) {
			expect(seen, type).toContain(type);
		}
		expectNoSolution([a, b, c], NEARLY.solution);
	});
});
