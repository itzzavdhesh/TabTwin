# AGENTS.md

## Architecture

Three-package npm workspace: `server/`, `webapp/`, `extension/`.

- **server/** — Express + WebSocket signaling server. Pure Node, no build step. Entry: `index.js`. Requires Redis (`REDIS_URL` env). Exits immediately if Redis is unreachable.
- **webapp/** — React 18 guest SPA (Vite + Tailwind). Runs on port 5173. No router library — uses `window.location.pathname` for routing in `App.jsx`.
- **extension/** — Chrome MV3 extension. Popup built with Vite (`popup/` source → `popup-dist/` output). Content scripts (`content/`) are plain JS, not Vite-bundled. Service worker in `background/serviceWorker.js`.

## Commands

```bash
npm install          # install all workspace deps
npm run server       # start signaling server (needs .env + Redis)
npm run dev:web      # guest web app on :5173
npm run dev:extension # extension popup dev server on :5174
npm run build        # build all three packages
npm run lint         # lint all three packages
```

Individual package lint: `npm run lint --workspace=server`, `npm run lint --workspace=webapp`, `npm run lint --workspace=extension`. Note: webapp and extension `lint` scripts just run `vite build` — there is no standalone linter configured.

Server "lint" is `node --check` on the three JS files — syntax validation only, no ESLint.

## Prerequisites

- Node >= 20
- Redis running and `REDIS_URL` set in `.env` (copy from `.env.example`)
- `ANTHROPIC_API_KEY` optional — only needed for AI agent features

Quick Redis: `docker run -d -p 6379:6379 redis:7-alpine`

## Conventions

- **Commit messages**: Conventional Commits enforced via commitlint + husky. Format: `type(scope): summary`. Scopes: `extension`, `server`, `webapp`.
- **ESM only**: All packages use `"type": "module"`. No CommonJS.
- **No TypeScript**: Entire codebase is plain JS (with JSDoc type annotations in server).
- **WebSocket protocol**: All messages are `{ event, payload }` objects. Routing is in `signalingHandler.js`.
- **Session storage**: Redis-backed (`sessionManager.js`) with 24h TTL. In-memory fallback available (`sessionManager.inmemory.js`) for testing — swap the import in `index.js`.
- **Extension content scripts**: Plain JS files loaded by Manifest V3 `content_scripts`. These are NOT processed by Vite — no JSX, no imports.
- **Extension popup**: React + Vite, rooted at `popup/`. Output goes to `popup-dist/` which `manifest.json` references for `default_popup`.

## Installed Skills

Skills live in `.agents/skills/`.

| Skill Name | Use Case |
| --- | --- |
| chrome-extensions | Build, debug, and publish Chrome MV3 extensions — manifest, content scripts, service workers, popups, Chrome APIs, Web Store submission. |
| tailwind-design-system | Build scalable design systems with Tailwind CSS v4 — design tokens, component libraries, responsive patterns. |

## Gotchas

- Server crashes on startup without `REDIS_URL`. No graceful degradation.
- Extension `popup-dist/` must exist before loading the extension in Chrome. Run `npm run build --workspace=extension` or `npm run dev:extension` first.
- Web app uses client-side routing via pathname (`/join/:id`, `/session/:id`). Vite dev server handles this, but production deploy needs a catch-all rule.
- No test framework is configured. No test scripts exist in any package.
- No CI/CD workflows exist yet (no `.github/` directory).
