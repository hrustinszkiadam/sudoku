export type { Difficulty, Mode } from "../shared/constants";
export type {
	ClientMessage,
	Player,
	Result,
	RoomStatus,
	ServerMessage,
	Snapshot,
} from "../shared/protocol";

export type ConnectionStatus =
	| "connecting"
	| "open"
	| "reconnecting"
	| "replaced"
	| "closed";
