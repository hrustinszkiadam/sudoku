# Multiplayer Sudoku

Online multiplayer sudoku on Cloudflare: one Worker serves the React SPA, the Hono API under `/api/*` and the `GameRoom` Durable Objects. See [PLAN.md](PLAN.md) for the design.

## Setup

Requirements: Node 22+, pnpm 10+, a Cloudflare account.

```sh
pnpm install
cp .dev.vars.example .dev.vars        # local secrets (Turnstile test keys)
pnpm db:migrate:local                 # create the local D1 schema
pnpm gen:puzzles -- --per-difficulty 500 --seed 42   # writes seeds/puzzles.sql
pnpm db:seed:local                    # load puzzles into local D1
pnpm dev                              # http://localhost:5173
```

`seeds/puzzles.sql` is git-ignored; it is fully reproducible from `--seed` (~90 s for 500 per difficulty).

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server with the Worker, DOs and D1 running locally in workerd |
| `pnpm build` | Production build into `dist/` |
| `pnpm typecheck` | `tsc -b` over the client, worker, shared, node and test projects |
| `pnpm lint` / `pnpm format` | Biome check / fix |
| `pnpm test` | All Vitest projects: `unit` (Node) and `workers` (workerd via `@cloudflare/vitest-plugin`) |
| `pnpm test:coverage` | Unit tests with coverage of `src/shared` |
| `pnpm test:e2e` | Playwright against the dev server (run `pnpm db:migrate:local && pnpm db:seed:local` first) |
| `pnpm run deploy` | Build and `wrangler deploy` (note: `pnpm deploy` is a built-in pnpm command, so use `pnpm run deploy`) |
| `pnpm gen:puzzles` | Offline puzzle generator, writes `seeds/puzzles.sql` |
| `pnpm db:generate` | Generate a SQL migration from the Drizzle schema |
| `pnpm db:migrate:local` / `:remote` | Apply D1 migrations |
| `pnpm db:seed:local` / `:remote` | Load `seeds/puzzles.sql` into D1 |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` |

## First deploy

```sh
npx wrangler login
npx wrangler d1 create sudoku          # put the id in wrangler.jsonc (already done for this repo)
npx wrangler secret put SESSION_SECRET # e.g. `openssl rand -hex 32`
npx wrangler secret put TURNSTILE_SECRET_KEY
pnpm db:migrate:remote
pnpm db:seed:remote
pnpm run deploy
```

Create a Turnstile widget for your `*.workers.dev` hostname (or custom domain) in the Cloudflare dashboard, then set its site key as `TURNSTILE_SITE_KEY` in `wrangler.jsonc` `vars` and its secret with `wrangler secret put TURNSTILE_SECRET_KEY`. Until then the committed site key is Cloudflare's always-pass test key.

## CI/CD

`.github/workflows/ci.yml` runs typecheck, lint, unit and worker tests and a build on every PR. On push to `main` it also applies remote D1 migrations and deploys. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
