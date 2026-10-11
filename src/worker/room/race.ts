import {
	ERROR_CODES,
	RACE_COUNTDOWN_MS,
	RACE_MAX_DURATION_MS,
} from "../../shared/constants";
import { digitAt, EMPTY, setCell } from "../../shared/sudoku/grid";
import { raceScoreMs } from "./results";
import { getPlayer, incrementPlayer, listPlayers } from "./storage";
import type { ModeHandler, Room } from "./types";

/**
 * Race: same puzzle, one board per player. Others only ever see `progress`
 * (counts), never digits. Notes are client-only.
 */
export const raceMessage: ModeHandler = async (room, ws, me, msg) => {
	switch (msg.type) {
		case "start":
			return start(room, ws, me.userId);
		case "end":
			if (me.userId !== room.meta.hostId) {
				return room.error(
					ws,
					ERROR_CODES.notHost,
					"Only the host can end the race",
				);
			}
			if (room.meta.status !== "playing") {
				return room.error(
					ws,
					ERROR_CODES.notPlaying,
					"The race is not running",
				);
			}
			return room.finish();
		case "place":
			return place(room, ws, me.userId, msg.cell, msg.digit);
		case "hint":
			return place(room, ws, me.userId, msg.cell, "hint");
		case "note":
		case "clear_notes":
			return room.error(
				ws,
				ERROR_CODES.invalidMessage,
				"Race notes are kept on your device",
			);
	}
};

async function start(room: Room, ws: WebSocket, userId: string) {
	if (userId !== room.meta.hostId) {
		return room.error(
			ws,
			ERROR_CODES.notHost,
			"Only the host can start the race",
		);
	}
	if (room.meta.status !== "lobby") {
		return room.error(
			ws,
			ERROR_CODES.notPlaying,
			"The race has already started",
		);
	}
	const connected = listPlayers(room.sql).filter((p) => p.connected).length;
	if (connected < 2) {
		return room.error(
			ws,
			ERROR_CODES.notEnoughPlayers,
			"At least 2 players are needed",
		);
	}
	const now = room.now();
	const startsAt = now + RACE_COUNTDOWN_MS;
	room.setMeta({
		status: "playing",
		startsAt,
		startedAt: startsAt,
		lastActivityAt: now,
	});
	// The alarm enforces the race time limit.
	await room.scheduleAlarm(startsAt + RACE_MAX_DURATION_MS);
	room.broadcast({ type: "status", status: "playing", startsAt });
	console.log({ event: "race_started", code: room.meta.code });
}

/** A player's move: a digit, or a hint that reveals the cell. */
async function place(
	room: Room,
	ws: WebSocket,
	userId: string,
	cell: number,
	digit: number | "hint",
) {
	const { meta } = room;
	const now = room.now();
	if (
		meta.status !== "playing" ||
		meta.startsAt === null ||
		now < meta.startsAt
	) {
		return room.error(ws, ERROR_CODES.notPlaying, "The race is not running");
	}
	const player = getPlayer(room.sql, userId);
	if (!player?.board || player.finishedAt !== null) {
		return room.error(ws, ERROR_CODES.notPlaying, "You have already finished");
	}
	if (player.board[cell] !== EMPTY) {
		return room.error(
			ws,
			ERROR_CODES.invalidMove,
			"That cell is already filled",
		);
	}

	const answer = digitAt(meta.solution, cell);
	const hint = digit === "hint";
	if (!hint && answer !== digit) {
		incrementPlayer(room.sql, userId, "mistakes");
		room.send(ws, { type: "mistake", cell, digit, by: userId });
		room.broadcast(
			{
				type: "progress",
				userId,
				filled: player.placements + player.hints,
				mistakes: player.mistakes + 1,
				hints: player.hints,
			},
			ws,
		);
		return;
	}

	const board = setCell(player.board, cell, answer);
	const done = board === meta.solution;
	const after = {
		...player,
		placements: player.placements + (hint ? 0 : 1),
		hints: player.hints + (hint ? 1 : 0),
		finishedAt: done ? now : null,
	};
	// One row write per accepted move.
	incrementPlayer(room.sql, userId, hint ? "hints" : "placements", {
		board,
		...(done ? { finishedAt: now } : {}),
	});
	const filled = after.placements + after.hints;
	room.sendToUser(userId, {
		type: "applied",
		version: filled,
		cell,
		digit: answer,
		by: userId,
		...(hint ? { hint: true } : {}),
	});
	room.broadcast(
		{
			type: "progress",
			userId,
			filled,
			mistakes: after.mistakes,
			hints: after.hints,
		},
		ws,
	);

	if (done) {
		const scoreMs = raceScoreMs(meta, after) ?? 0;
		const finishMs = now - (meta.startsAt ?? now);
		room.broadcast({ type: "player_finished", userId, scoreMs, finishMs });
		await endIfEveryoneFinished(room);
	}
}

/** Ends the race once every connected player has finished. */
export async function endIfEveryoneFinished(room: Room): Promise<void> {
	if (room.meta.mode !== "race" || room.meta.status !== "playing") return;
	const players = listPlayers(room.sql);
	const connected = players.filter((p) => p.connected);
	if (
		players.some((p) => p.finishedAt !== null) &&
		connected.every((p) => p.finishedAt !== null)
	) {
		await room.finish();
	}
}
