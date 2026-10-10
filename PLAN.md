# Multiplayer Sudoku: Implementation Plan

## How to use this plan (instructions for Claude Code)

- **First, before any other step (Cloudflare agent setup):** Fetch and execute the appropriate instructions to set me up for Cloudflare from https://developers.cloudflare.com/agent-setup/prompt.md
- Work **one phase at a time**, in order. A phase is done only when its acceptance criteria pass, `pnpm typecheck`, `pnpm lint` and `pnpm test` are green, and the work is committed. Tick the phase's checkboxes in this file as you go.
- Cloudflare APIs move fast. **Before writing Cloudflare-specific code, read the current docs** for: Durable Objects WebSocket Hibernation API, `@cloudflare/vite-plugin`, `@cloudflare/vitest-pool-workers`, Workers Static Assets routing, D1, the Rate Limiting binding and Turnstile. Install the latest stable versions of packages. Don't pin versions from memory.
- Everything under **Fixed decisions** is settled. If one seems wrong or impossible, stop and ask instead of silently changing it.
- Prefer small, readable modules over clever abstractions. No dependency gets added without a reason stated in the commit message.

---

## Product summary

An online multiplayer sudoku. A player creates a room, shares the link, and others join and play in real time. No sign-up needed: everyone starts as a guest with a nickname.

**Modes**

- **Co-op** (Phase 2): everyone fills **one shared board**. Players see each other's selected cell (coloured outline). Correct digits lock in place, and wrong digits are rejected and counted as mistakes. The room wins when the board is complete. Playing alone in a co-op room is the single-player mode.
- **Race** (Phase 4): everyone gets the **same puzzle on their own board**. Players see opponents' progress (cells filled, mistakes) but never their digits. Ranking is by `finish time + 10 s × mistakes`.

**Difficulties:** easy, medium, hard, expert.

---

## Fixed decisions

| Area | Decision |
|---|---|
| Repo | Single repo, single package, pnpm, TypeScript `strict` everywhere |
| Deployment | One Cloudflare Worker serving static assets (SPA), the Hono API and the Durable Objects, all on one origin |
| Frontend | React + Vite + `@cloudflare/vite-plugin`, Tailwind CSS, Zustand, React Router (client-side only) |
| Real-time | One `GameRoom` Durable Object per room, SQLite-backed, **WebSocket Hibernation API** (`ctx.acceptWebSocket`). Never use `ws.accept()` |
| WS client | `partysocket` reconnecting WebSocket |
| Validation | Zod **4.5.0 or newer** for every WebSocket message and every API input |
| Database | D1 + Drizzle ORM, SQL migrations in `/migrations` |
| Authority | Server-authoritative. **The solution never leaves the server**: not in snapshots, API responses or logs |
| Lint/format | Biome |
| Tests | Vitest (Node pool for pure code, `@cloudflare/vitest-pool-workers` for Worker/DO code), Playwright for end-to-end |

**Explicitly out of scope:** SSR frameworks, CRDTs/Yjs, Workers KV, Queues, Redis, Socket.IO, any external service other than Cloudflare. In-room chat is out for now.

---

## Repository layout

```
sudoku/
  src/
    client/              React app
      routes/            Home, Room, Daily, Leaderboard, DevBoard
      components/        Board, Cell, NumberPad, PlayerList, Timer, ...
      store/             Zustand stores
      net/               socket wrapper (partysocket), API client
    worker/
      index.ts           Hono app + exports GameRoom
      routes/            session.ts, rooms.ts, daily.ts, leaderboard.ts
      middleware/        session.ts, rateLimit.ts, turnstile.ts
      room/              GameRoom.ts, coop.ts, race.ts, storage.ts
      db/                drizzle schema + queries
    shared/
      sudoku/            grid utils, solver, generator, grader
      protocol.ts        Zod schemas + TS types for every WS message
      constants.ts       limits, colors, difficulty names
  scripts/
    generate-puzzles.ts  offline puzzle generator -> seeds/puzzles.sql
  seeds/
  migrations/
  e2e/                   Playwright tests
  test/                  vitest-pool-workers tests
  wrangler.jsonc
  vite.config.ts
  PLAN.md
```

Code in `src/shared` must be runtime-agnostic (no DOM, no Node, no Workers APIs) so the client, the Worker and the Node script can all import it.

---

## Wrangler configuration

```jsonc
// wrangler.jsonc. The Vite plugin supplies assets.directory.
{
  "name": "sudoku",
  "main": "src/worker/index.ts",
  "compatibility_date": "<today's date>",
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "durable_objects": {
    "bindings": [{ "name": "GAME_ROOM", "class_name": "GameRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["GameRoom"] }],
  "d1_databases": [
    { "binding": "DB", "database_name": "sudoku", "database_id": "<id>" }
  ],
  "triggers": { "crons": ["5 0 * * *"] },
  "observability": { "enabled": true }
}
```

Add the Rate Limiting binding(s) per the current docs.

**Routing rule:** every server route, WebSocket included, lives under `/api/*`. Every other path is either a static asset or falls back to `index.html`.

**Secrets / vars**

| Name | Kind | Purpose |
|---|---|---|
| `SESSION_SECRET` | secret | signs the session cookie |
| `TURNSTILE_SECRET_KEY` | secret | server-side Turnstile verification |
| `TURNSTILE_SITE_KEY` | var | exposed to the client |

Use `.dev.vars` locally (git-ignored, with a committed `.dev.vars.example`). In development use Cloudflare's documented Turnstile **test keys**.

---

## Shared sudoku core (`src/shared/sudoku`)

**Representation**

- Grid: 81-character string, `'1'`–`'9'` for digits and `'0'` for empty. Cell index `i = row * 9 + col`.
- Notes: `number[81]`, each a 9-bit mask (bit `d-1` set means note `d` is present).

**Functions (all pure, all unit-tested)**

- `rowOf`, `colOf`, `boxOf`, `peers(i)`: the 20 peers of a cell, precomputed once.
- `conflicts(grid) -> Set<number>`: cells whose digit repeats in a row, column or box.
- `isComplete(grid)`, `isSolved(grid, solution)`.
- `solve(grid) -> string | null`: bitmask backtracking with the most-constrained-cell heuristic.
- `countSolutions(grid, limit = 2) -> number`.
- `grade(puzzle) -> { difficulty, score }`: a human-style solver that applies techniques in order of difficulty and records the hardest one needed:
  - **easy:** naked/hidden singles only
  - **medium:** plus naked/hidden pairs, pointing pairs, box-line reduction
  - **hard:** plus naked/hidden triples, X-Wing
  - **expert:** plus Swordfish/XY-Wing, or anything requiring guessing
- `generate(rng, targetDifficulty)`: build a random full solution, then remove clues in random symmetric order while `countSolutions === 1`. Grade the result and retry until it matches the target.
- `removeNoteFromPeers(notes, cell, digit)`: used when a digit is placed.
- Seeded RNG (e.g. mulberry32) so generation is reproducible.

---

## Puzzle generation (`scripts/generate-puzzles.ts`)

- Run with `pnpm gen:puzzles -- --per-difficulty 500 --seed 42`.
- Generates N puzzles per difficulty, verifies a unique solution for each, grades them, and writes `seeds/puzzles.sql` containing `INSERT` statements.
- `pnpm db:seed:local` / `pnpm db:seed:remote` apply it via `wrangler d1 execute`.
- Puzzles are **never** generated inside the Worker, since Free-plan CPU per request is tiny.

---

## D1 schema (Drizzle)

```
puzzles       id TEXT PK, givens TEXT(81), solution TEXT(81),
              difficulty TEXT, score INT, created_at INT
              INDEX (difficulty)

users         id TEXT PK, kind TEXT ('guest'|'account'), name TEXT,
              created_at INT

games         id TEXT PK, room_code TEXT, puzzle_id TEXT, mode TEXT,
              difficulty TEXT, started_at INT, finished_at INT,
              status TEXT ('won'|'abandoned'), mistakes INT

game_players  game_id TEXT, user_id TEXT, name TEXT, placements INT,
              mistakes INT, finish_ms INT NULL, score_ms INT NULL,
              rank INT NULL
              PK (game_id, user_id), INDEX (user_id)

daily_puzzles date TEXT PK ('YYYY-MM-DD'), puzzle_id TEXT
```

**Random puzzle selection:** use a cheap method that doesn't scan the whole table (e.g. pick a random `rowid` in range, falling back to the next existing one). Avoid `ORDER BY random()`.

---

## Identity (guest sessions)

- `GET /api/session`: if there's no valid session cookie, create a guest user (`crypto.randomUUID()`, random name like `Otter-4821`), insert it into `users`, and set a **signed, HttpOnly, Secure, SameSite=Lax** cookie with Hono's signed-cookie helpers. Returns `{ userId, name }`.
- `PATCH /api/session`: body `{ name }`. Name is 1–20 chars, trimmed, printable characters only, with a small banned-word filter.
- Session middleware on all other `/api/*` routes: verify the cookie and put `userId`/`name` in the Hono context. Respond 401 if invalid.
- Accounts (Better Auth on D1) come in Phase 6. Design `users.kind` so a guest can later be linked to an account.

---

## HTTP API (Hono)

| Method & path | Purpose |
|---|---|
| `GET /api/health` | `{ ok: true }` |
| `GET /api/session`, `PATCH /api/session` | see Identity |
| `POST /api/rooms` | body `{ mode, difficulty, turnstileToken }`. Verifies Turnstile, rate-limits, picks a puzzle, generates a room code, calls `stub.init(...)` over RPC, returns `{ code }` |
| `GET /api/rooms/:code` | lobby preview: `{ exists, mode, difficulty, status, playerCount, maxPlayers }` |
| `GET /api/rooms/:code/ws` | WebSocket upgrade (see below) |
| `GET /api/daily` | today's daily puzzle as a room to join (Phase 5) |
| `GET /api/leaderboard?difficulty=&mode=` | top results (Phase 5) |
| `GET /api/me/history` | the current user's last 20 games (Phase 5) |

**Room codes:** 6 characters from an unambiguous alphabet (no `0 O 1 I L`). Get the stub with `env.GAME_ROOM.getByName(code)`. If `init` reports the room already exists, retry with a new code (max 5 attempts).

**WebSocket upgrade route:**
1. Require `Upgrade: websocket`, otherwise return 426.
2. Require a valid session.
3. Build a new `Request` to forward to the DO. **Remove any client-supplied `X-User-*` headers**, then set `X-User-Id` and `X-User-Name` from the verified session.
4. `return stub.fetch(forwardedRequest)`.

---

## `GameRoom` Durable Object

### Storage (SQLite inside the DO)

Create tables in the constructor inside `ctx.blockConcurrencyWhile`, then load `meta` into an in-memory cache.

```
meta     (single row) code, mode, difficulty, puzzle_id, givens, solution,
         board (co-op), notes JSON (co-op), status ('lobby'|'playing'|'finished'),
         host_id, version INT, mistakes INT, created_at, starts_at,
         started_at, finished_at, last_activity_at
players  user_id PK, name, color, joined_at, connected INT,
         placements INT, mistakes INT, board TEXT NULL (race),
         finished_at NULL (race)
```

Each accepted move must cost **one** row write where possible: update `meta` (co-op) or the player's row (race) in a single statement.

### Lifecycle rules

- `init({ code, mode, difficulty, puzzleId, givens, solution, hostId })`: RPC method. Returns `{ created: false }` if `meta` already exists. Sets status `playing` for co-op and `lobby` for race. Schedules the cleanup alarm.
- `fetch()` handles the upgrade:
  1. Reject if the room isn't initialized (404) or is full (max 8 players, 409).
  2. Create a `WebSocketPair`, then `ctx.acceptWebSocket(server, [userId])` and `server.serializeAttachment({ userId, name })`.
  3. Upsert the player (assign the next free colour from an 8-colour palette).
  4. Send `snapshot` to this socket and broadcast `player_joined`.
- If a user opens a second tab, the newer socket wins: close the older one with code 4000.
- **Keepalive:** in the constructor, `ctx.setWebSocketAutoResponse` maps `"ping"` to `"pong"`. The client sends `"ping"` every 30 s.
- **No `setTimeout` / `setInterval` anywhere in the DO** (they block hibernation). Clocks are rendered client-side from `started_at`. Anything time-based uses the alarm.
- `webSocketMessage`:
  1. Reject messages over 1 KB.
  2. JSON-parse and validate with the protocol schema.
  3. Apply a per-connection token bucket (burst 20, refill 10/s). Excess messages get `error { code: 'rate_limited' }`.
  4. Dispatch to `coop.ts` or `race.ts`.
- `webSocketClose` / `webSocketError`: mark the player disconnected and broadcast `player_left`. In co-op, players stay in the list greyed out.
- **Alarm (cleanup):** if no sockets are connected and `last_activity_at` is more than 24 h ago, call `ctx.storage.deleteAll()`. Otherwise reschedule for 24 h after `last_activity_at`. In race mode the alarm also ends the game at `starts_at + 2 h`.
- Recover all per-socket identity from `deserializeAttachment()` and `ctx.getWebSockets()`. Never rely on in-memory maps surviving hibernation (a token bucket resetting on wake is acceptable).
- **Snapshots are built by a single `toClientSnapshot(forUserId)` function that whitelists fields.** The `solution` field must never appear in it.

### Co-op rules (`coop.ts`)

- `place { cell, digit }`:
  - Reject if the cell is a given or already filled, or if the status isn't `playing`.
  - Wrong digit: increment room and player `mistakes`, broadcast `mistake { cell, digit, by }`. The board is unchanged.
  - Correct digit: set the board, clear that cell's notes, remove the digit from peers' notes, increment the player's `placements` and `version`, then broadcast `applied`.
  - If the board is now complete: set status `finished` and `finished_at`, write `games` + `game_players` rows to D1, and broadcast `game_over`.
- `note { cell, digit }`: toggle the note. Only allowed on empty cells. Bump `version` and broadcast.
- `clear_notes { cell }`: clear all notes in an empty cell.
- `select { cell | null }`: presence only. Not persisted, no version bump, broadcast as `presence`.
- Correct digits are locked, so there is no "erase digit" in co-op.

### Race rules (`race.ts`, Phase 4)

- Lobby until the host sends `start` (minimum 2 connected players). Then set `starts_at = now + 3000` and status `playing`, and broadcast `status`. Moves before `starts_at` are rejected.
- Each player has their own `board` and plays the same correct/wrong logic as co-op on it.
- Broadcast **only** `progress { userId, filled, mistakes }` to others. Send `applied` / `mistake` to the acting player only.
- When a player completes: set `finished_at` and `score_ms = (finished_at - starts_at) + 10000 * mistakes`, then broadcast `player_finished`.
- The game ends when every connected player has finished, or the host ends it. Assign ranks, write to D1, broadcast `game_over`.
- Notes in race mode are **client-only** (stored in `localStorage` keyed by room code) and never sent to the server.

---

## WebSocket protocol (`src/shared/protocol.ts`)

All messages are JSON objects with a `type` field, defined as Zod discriminated unions. Export both schemas and inferred types.

**Client → server:** `place {cell, digit}`, `note {cell, digit}`, `clear_notes {cell}`, `select {cell|null}`, `start` (race host), `end` (race host), `resync`.

**Server → client**
- `snapshot`: `{ version, me, mode, difficulty, status, givens, board, notes, players[], mistakes, startsAt, startedAt, finishedAt }`
  - In race mode, `board`/`notes` are the requesting player's own.
  - `players[]` contains `{ userId, name, color, connected, selected, placements, mistakes, filled, finished }`.
- `applied {version, cell, digit, by}`
- `mistake {cell, digit, by}`
- `notes {version, cell, mask, by}`
- `presence {userId, cell}`
- `player_joined {player}`, `player_left {userId}`
- `progress {userId, filled, mistakes}`
- `status {status, startsAt?}`
- `player_finished {userId, scoreMs}`
- `game_over {results[]}`
- `error {code, message}`

**Ordering:** every state-changing broadcast carries `version`. If the client sees a gap (`version !== local + 1`), it sends `resync` and the server replies with a fresh `snapshot`. The client also requests a snapshot after every reconnect.

---

## Client

### Routes
- `/`: home. Edit nickname, create a room (mode + difficulty), join by code.
- `/r/:code`: room.
- `/daily`: today's daily puzzle (Phase 5).
- `/leaderboard`: Phase 5.
- `/dev/board`: development-only page for the board component (Phase 1).

### Room screen
- Board, number pad, notes toggle.
- Player list: colour dot, name, connected state; progress bars in race mode.
- Mistakes counter, timer, "copy invite link" button.
- Connection banner ("Reconnecting…").
- Race lobby: player list and Start button for the host; a 3-2-1 countdown driven by `startsAt`.

### Board behaviour
- 9×9 CSS grid of `<button>`s with thick 3×3 box borders. Givens in bold.
- Highlight the selected cell's row, column and box, plus all cells containing the same digit.
- Other players' selections shown as outlines in their colour (co-op).
- Client-side conflict highlighting via `conflicts()`.
- Optimistic placement: show the digit dimmed until `applied` arrives. On `mistake`, flash the cell red for 600 ms and clear it.
- **Keyboard:** arrows / WASD to move; `1`–`9` to place; `N` to toggle notes mode; `Shift`+`1`–`9` to toggle a single note; `Backspace` to clear notes; `Esc` to deselect.
- **Mobile:** tap a cell, then use the number pad. The layout must fit a 360 px wide screen without horizontal scroll.
- **Accessibility:** each cell has an `aria-label` like "Row 3, column 5, empty, notes 2 4 7". Visible focus ring. Colour is never the only signal.
- Dark mode following `prefers-color-scheme`.

### State and networking
- One Zustand store per room session: snapshot data, pending moves, connection status.
- `net/socket.ts` wraps `partysocket`: `/api/rooms/:code/ws` URL, 30 s `"ping"`, exponential backoff, typed `send()` validated against the protocol schema in development builds.

---

## Security and abuse checklist

- [x] The solution is never sent to clients. Covered by a test that serializes every server message type and asserts no 81-digit solution string is present.
- [x] Client-supplied `X-User-*` headers are stripped in the Worker.
- [x] Turnstile is verified server-side on `POST /api/rooms`.
- [x] Rate Limiting binding on room creation (per user) and on `GET /api/session` creation (per IP).
- [x] Per-connection token bucket and 1 KB message limit in the DO.
- [x] Max 8 players per room.
- [x] Nickname validation applied both on the server and in the DO.
- [x] Cookie is HttpOnly, Secure, SameSite=Lax, signed.

---

## Testing

**Unit (Vitest, Node):** the sudoku core. Solver correctness on known puzzles, `countSolutions` on puzzles with 0/1/many solutions, `conflicts`, grader tiers on hand-picked puzzles, generator output is unique-solution, protocol schemas accept/reject.

**Worker / DO (`@cloudflare/vitest-pool-workers`):**
- `init` is idempotent; room codes collide correctly.
- Join over WebSocket and receive a snapshot without the solution.
- Correct placement → `applied`, `version` increments. Wrong placement → `mistake`, board unchanged.
- Completing the board writes `games` / `game_players` to D1.
- **Evicting the DO mid-game** (use the eviction test helpers) preserves board, players and version, and sockets keep working.
- The cleanup alarm deletes a stale room and reschedules for an active one.
- Race: moves before `startsAt` are rejected; other players receive only `progress`.

**E2E (Playwright):** two browser contexts join the same co-op room. One places a digit and the other sees it. A player goes offline, comes back and resyncs. A full race between two players ends with ranks.

---

## CI/CD (GitHub Actions)

- On PR: `pnpm install` → typecheck → lint → unit tests → worker tests → build.
- On push to `main`: the same checks, then `wrangler d1 migrations apply DB --remote`, then `wrangler deploy`, using the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

---

## Phases

### Phase 0: Scaffold
- [x] Cloudflare agent setup completed (see "How to use this plan"), and `wrangler whoami` shows the right account
- [x] Vite + React + `@cloudflare/vite-plugin` + Worker with Hono, Tailwind, Biome, Vitest (both pools), Playwright
- [x] `wrangler.jsonc` as above, D1 database created, `.dev.vars.example`
- [x] `GET /api/health`; SPA fallback works for `/r/anything`
- [x] Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `deploy`, `gen:puzzles`, `db:migrate:local`, `db:migrate:remote`, `db:seed:local`, `db:seed:remote`
- [x] README with setup steps

**Accept:** `pnpm dev` serves the app and `/api/health` from one origin. All test commands run. The first deploy succeeds. _(Deploy pending: blocked for the agent, run `pnpm run deploy` manually.)_

### Phase 1: Core, puzzles, board UI
- [x] Shared sudoku core with full unit tests
- [x] Puzzle generator and seeds; D1 schema and migrations
- [x] Guest sessions (`/api/session`)
- [x] Board, NumberPad and keyboard handling on `/dev/board`, driven by a local in-memory engine (conflict checking only)

**Accept:** 500 puzzles per difficulty seeded locally. The dev board is fully playable with keyboard and touch. Core test coverage is above 90%.

### Phase 2: Co-op rooms
- [x] `POST /api/rooms`, `GET /api/rooms/:code`, WebSocket route
- [x] `GameRoom` DO: init, join, co-op rules, presence, `game_over` + D1 write
- [x] Home and Room screens wired to the real backend
- [x] DO tests for join / place / mistake / complete

**Accept:** two browsers can create, join and finish a co-op game together. Solo play works as a one-person co-op room.

### Phase 3: Resilience and abuse protection
- [x] Reconnect with resync, version-gap detection, newer-tab-wins
- [x] Cleanup alarm
- [x] Turnstile, Rate Limiting binding, token bucket, size and player limits
- [x] Eviction tests and the "solution never leaks" test
- [x] Playwright co-op and reconnect tests

**Accept:** killing the network for 10 s and restoring it resyncs correctly. Evicting the DO mid-game loses nothing. Every item in the security checklist is ticked.

### Phase 4: Race mode
- [x] Lobby, host start, countdown, per-player boards, progress broadcasts, scoring, ranks
- [x] Client-side notes in `localStorage`
- [x] DO tests and a Playwright race test

**Accept:** a 2–4 player race plays end to end. Opponents' digits are never visible in network traffic.

### Phase 5: Daily puzzle, history, leaderboards
- [x] Cron picks the next day's puzzle into `daily_puzzles` (one per difficulty or a single medium puzzle; choose one and document it) _Chosen: a single **medium** puzzle per UTC day, played as a personal solo co-op room; see README._
- [x] `/daily`, `/leaderboard`, `GET /api/me/history`
- [x] Leaderboard queries cached briefly with the Cache API

**Accept:** the daily puzzle changes at UTC midnight. The leaderboard shows the best `score_ms` per user per difficulty.

### Phase 6: Accounts (optional)
- [ ] Better Auth on D1 (via the Drizzle adapter) with GitHub and Google sign-in
- [ ] Link the current guest's history to the new account on first sign-in

### Phase 7: Polish (optional)
- [ ] Hints (reveal one cell, counted as a penalty), undo for notes, sound toggle, PWA install

---

## Conventions

- Named exports. No default exports except where a framework requires them.
- No `any`. Use `unknown` plus Zod at every boundary.
- Errors sent to clients use stable `code` strings defined in `src/shared/constants.ts`.
- Room events are logged as structured JSON (`console.log({ event, code, ... })`), never logging solutions or cookies.
- One logical change per commit, with a conventional-commit message (`feat:`, `fix:`, `test:` …).
