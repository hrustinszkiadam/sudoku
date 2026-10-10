import { ERROR_CODES } from "../../shared/constants";
import { digitAt, EMPTY, setCell } from "../../shared/sudoku/grid";
import { removeNoteFromPeers, toggleNote } from "../../shared/sudoku/notes";
import { incrementPlayer } from "./storage";
import type { ModeHandler, Room } from "./types";

/** Co-op: one shared board; correct digits lock, wrong ones count as mistakes. */
export const coopMessage: ModeHandler = async (room, ws, me, msg) => {
	switch (msg.type) {
		case "place":
			return place(room, ws, me.userId, msg.cell, msg.digit);
		case "hint":
			if (!editableCell(room, ws, msg.cell)) return;
			return applyCorrect(room, me.userId, msg.cell, true);
		case "note":
		case "clear_notes": {
			if (!editableCell(room, ws, msg.cell)) return;
			const notes = room.meta.notes.slice();
			notes[msg.cell] =
				msg.type === "note" ? toggleNote(notes[msg.cell], msg.digit) : 0;
			const version = room.meta.version + 1;
			const clock = startClock(room);
			room.setMeta({ notes, version, lastActivityAt: room.now(), ...clock });
			announceClock(room, clock);
			room.broadcast({
				type: "notes",
				version,
				cell: msg.cell,
				mask: notes[msg.cell],
				by: me.userId,
			});
			return;
		}
		case "start":
		case "end":
			return room.error(
				ws,
				ERROR_CODES.invalidMessage,
				"Only race rooms can be started or ended",
			);
	}
};

/**
 * The co-op clock starts with the first move (digit, note or hint), not when
 * the room is created, so waiting for friends to join doesn't count. Returns
 * the patch to merge into the move's single meta write.
 */
function startClock(room: Room): { startedAt?: number } {
	return room.meta.startedAt === null ? { startedAt: room.now() } : {};
}

/** Tells everyone the clock started, after the move has been persisted. */
function announceClock(room: Room, clock: { startedAt?: number }): void {
	if (clock.startedAt !== undefined) {
		room.broadcast({
			type: "status",
			status: "playing",
			startedAt: clock.startedAt,
		});
	}
}

/** True when the room is playing and `cell` is empty; otherwise reports an error. */
function editableCell(room: Room, ws: WebSocket, cell: number): boolean {
	if (room.meta.status !== "playing") {
		room.error(ws, ERROR_CODES.notPlaying, "The game is not in progress");
		return false;
	}
	if (room.meta.board[cell] !== EMPTY) {
		room.error(ws, ERROR_CODES.invalidMove, "That cell is already filled");
		return false;
	}
	return true;
}

async function place(
	room: Room,
	ws: WebSocket,
	userId: string,
	cell: number,
	digit: number,
) {
	if (!editableCell(room, ws, cell)) return;
	const { meta } = room;
	const now = room.now();

	if (digitAt(meta.solution, cell) !== digit) {
		const clock = startClock(room);
		room.setMeta({
			mistakes: meta.mistakes + 1,
			lastActivityAt: now,
			...clock,
		});
		announceClock(room, clock);
		incrementPlayer(room.sql, userId, "mistakes");
		room.broadcast({ type: "mistake", cell, digit, by: userId });
		return;
	}

	await applyCorrect(room, userId, cell, false);
}

/** Locks in the solution digit for `cell`, from a placement or a hint. */
async function applyCorrect(
	room: Room,
	userId: string,
	cell: number,
	hint: boolean,
) {
	const { meta } = room;
	const digit = digitAt(meta.solution, cell);
	const board = setCell(meta.board, cell, digit);
	const notes = removeNoteFromPeers(meta.notes, cell, digit);
	notes[cell] = 0;
	const version = meta.version + 1;
	const clock = startClock(room);
	room.setMeta({
		board,
		notes,
		version,
		lastActivityAt: room.now(),
		...clock,
		...(hint ? { hints: meta.hints + 1 } : {}),
	});
	announceClock(room, clock);
	incrementPlayer(room.sql, userId, hint ? "hints" : "placements");
	room.broadcast({
		type: "applied",
		version,
		cell,
		digit,
		by: userId,
		...(hint ? { hint: true } : {}),
	});

	if (board === meta.solution) await room.finish();
}
