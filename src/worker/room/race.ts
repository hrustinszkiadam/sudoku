import { ERROR_CODES } from "../../shared/constants";
import type { ModeHandler } from "./types";

/** Race mode arrives in Phase 4. */
export const raceMessage: ModeHandler = (room, ws) => {
	room.error(ws, ERROR_CODES.invalidMessage, "Race mode is not available yet");
};
