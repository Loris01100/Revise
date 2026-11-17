# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Revise is a personal spaced-repetition (FSRS) revision app for a student with ADHD, deployed at `revise.reesch.com`. Product context: [PRODUCT.md](PRODUCT.md). Build history and the reasoning behind each feature: [docs/ETAPES.md](docs/ETAPES.md). Design decisions: [docs/design/decisions.md](docs/design/decisions.md). Visual system: [web/DESIGN.md](web/DESIGN.md).

**Language:** UI text, code comments, docs and commit-adjacent docs are in French. Keep new UI copy and comments in French. Commit messages use the `type : message` format (e.g. `feat : JSON re-import`).

## Commands

From the repo root (npm workspaces `web` and `worker`):

```sh
npm run build      # vite build of web/ → web/dist
npm run dev        # build web, then `wrangler dev` (which runs wasm-pack on core/ first)
npm run deploy     # build web, then `wrangler deploy`
npm run typecheck -w worker   # tsc --noEmit on the Worker
npm run dev -w web            # Vite dev server for the frontend alone
```

Rust core (`core/`, crate `revise-core`):

```sh
cargo test --manifest-path core/Cargo.toml              # all tests
cargo test --manifest-path core/Cargo.toml <test_name>  # single test
wasm-pack build core --target web --release              # what wrangler's [build] runs
```

D1 migrations (from `worker/`): `npx wrangler d1 migrations apply revise --local` then `--remote`.

Prerequisites: Rust + `wasm32-unknown-unknown` target, `wasm-pack`, `wrangler login`.

There is no dev auth bypass: every `/api/*` route requires a valid Cloudflare Access JWT in `Cf-Access-Jwt-Assertion`, so local `wrangler dev` API calls return 401. Past UI verification was done in headless Chrome against a mocked API.

## Architecture

One Cloudflare Worker serves both the API and the static SPA. Three parts:

- **`core/` — Rust → WASM.** Pure logic, no I/O: `fsrs.rs` (`schedule(state, grade, now)` on `rs-fsrs`, 90 % retention, grades 1–4), `session.rs` (`compose`: due-date order, new-card quota, subject/type alternation, `quick5` mode), `cards.rs` (`validate_cards`: tolerant parsing of pasted Claude JSON, per-card rejection reasons, dedup, length limits). `wasm.rs` is the JS boundary: JSON strings shaped like D1 rows, ISO 8601 dates. Functions must stay pure in `now` (rs-fsrs's `Card::new()` reads the clock, so `schedule` builds the card itself). Card-validation tests use real batches in `core/tests/fixtures/`.
- **`worker/` — Hono on Workers + D1.** `index.ts` mounts `requireUser` (`auth.ts`: jose JWT check against `TEAM_DOMAIN`/`POLICY_AUD`, sets `c.var.user` = lowercased email and `c.var.admin`) on `/api/*`. All routes are in `routes.ts`. `core.ts` imports `core/pkg` (wasm-pack `--target web` output + `initSync`, since wrangler imports `.wasm` as a `WebAssembly.Module`). `core/pkg` is generated and gitignored; `wrangler dev`/`deploy` rebuild it.
- **`web/` — Vite + SolidJS, no router.** `ui.tsx` has a `path` signal + `go()` (pushState); `index.tsx` switches screens on it. `api.ts` wraps fetch and tells apart `Offline`, `Expired` (Access redirect) and `Failed`. `prompt.ts` builds the card-generation prompt the user pastes into Claude.

### Cross-cutting rules

- **Multi-user data split:** content (`subjects`, `cards`, `drawings`) is shared; progress (`card_state`, `reviews`, `sessions`, `parked_thoughts`) is per `user_id` (migration `0003_users.sql`). Only `ADMIN_EMAIL` can delete content. Invites are managed in the Access policy, not in the app.
- **Card lifecycle:** imports create `draft` cards with no `card_state`. A card gets a `card_state` row, and enters FSRS, only when accepted (`active`). Manual creation goes straight to `active`.
- **Import has no paid API.** Claude generates cards outside the app; the user pastes the JSON into `POST /api/imports` (1 MB body limit), validated by `validate_cards`. Export uses the same JSON format.
- **Offline / PWA:** `web/sw.js` is a template. The `revise-sw` plugin in `vite.config.ts` fills in `__FILES__`/`__VERSION__` at build (Shiki grammars/themes other than github-light/dark are left out of the precache). The API is network-first with a cached fallback. Offline sessions use a prepared queue (`GET /api/queue`) and sync later: review posts are idempotent on a client-chosen id, and they accept a late `reviewed_at`, `started_at` and `ended_at`. Keep new write endpoints idempotent in the same way.
- **Card content rendering:** `==term==` highlight, `` `code` ``, fenced code (Shiki, loaded on demand), ```` ```mermaid ```` (loaded on demand), `___` cloze blanks (also inside code), and `![dessin](id)` drawing references. Drawings are immutable: editing one creates a new drawing, and orphans are cleaned up lazily.
- **Attention-protecting UX constraints** (from PRODUCT.md / decisions.md): no streaks, no backlog counts in the foreground, no notifications, no visible navigation in a session, answer typed before reveal. Keyboard shortcuts in a session: `Enter` reveals (`Ctrl+Enter` for long answers), `1`–`4` grade, `P` parks a thought, `Esc` pauses.

### Design workflow

UX/UI work goes through skills that are not versioned (install commands in [README.md](README.md)): **Intent** (`/intent`, `/journey`, `/wireframe`, `/fortify`, …) for structure and user journeys, **Impeccable** (`/impeccable …`) for the coded visual rendering. Their outputs live in `docs/design/`.
