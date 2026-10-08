import { DurableObject } from "cloudflare:workers";

export class GameRoom extends DurableObject<Env> {}
