# AGENTS.md

This file provides guidance for agentic coding tools working in this repository.

## Project Overview

`rio-tinto` is a self-hosted tennis court booking assistant for `riotinto.pt`. It is an npm monorepo with two workspaces:

- **`api/`** — Node.js 22 REST API built with [Hono](https://hono.dev/) v4, using SQLite (`better-sqlite3`) for storage and `tsx` for development
- **`frontend/`** — React 18 SPA built with Vite 5, styled with Tailwind CSS v3, using React Router v6

## Build, Dev, and Type-Check Commands

Run from the **repo root** unless otherwise noted.

```bash
# Development
npm run dev:api           # Start API with hot-reload (tsx watch)
npm run dev:frontend      # Start Vite dev server

# Build
npm run build             # Build both workspaces (tsc + vite build)
npm run build --workspace=api       # Build API only (tsc -> dist/)
npm run build --workspace=frontend  # Build frontend only (tsc --noEmit + vite build)

# Type-check only (no emit) — run from frontend/
tsc --noEmit

# Production start (API, after build)
node dist/index.js        # Run from api/
```

### Docker / Infrastructure

```bash
make build    # Build both Docker images (tagged with git SHA + latest)
make push     # Push images to registry.henriquesf.me
make release  # build + push
```

## Testing and Linting

**There are no tests, no test runner, and no linter configured in this project.** There is no Jest, Vitest, ESLint, or Prettier. Do not add test or lint scripts without explicit instruction.

The closest to a validation step is the TypeScript compiler:

```bash
# From api/:
npx tsc --noEmit

# From frontend/:
npx tsc --noEmit
```

## TypeScript Configuration

Both workspaces use strict TypeScript. Key settings:

| Setting | Value | Notes |
|---|---|---|
| `strict` | `true` | All strict checks enabled |
| `noUncheckedIndexedAccess` | `true` | Array/map index access returns `T \| undefined` |
| `target` | `ES2022` | Both workspaces |
| `module` (api) | `NodeNext` | Requires `.js` extensions on local imports |
| `moduleResolution` (frontend) | `bundler` | Vite handles resolution; no `.js` extensions |
| `isolatedModules` (frontend) | `true` | Required for Vite's single-file transform |

## Code Style Guidelines

### Imports

- External/third-party imports come first, then local imports
- Use `import type { ... }` for type-only imports — always, without exception
- In `api/`, all local imports **must** include the `.js` extension (NodeNext requirement):
  ```ts
  import { openDb } from './db.js';
  import type { StoredAccount } from './types.js';
  ```
- In `frontend/`, no extension on local imports (bundler resolution):
  ```ts
  import { useAuth } from '../AuthContext';
  import type { ScheduleSlot } from '../types';
  ```
- Side-effect imports (e.g., `import 'dotenv/config'`) go at the top of the entry file

### Types

- Use `interface` for object shapes, component props, and domain models
- Use `type` for unions, aliases, and `InstanceType<...>` patterns
- Name component prop interfaces as `<ComponentName>Props` (e.g., `BookingModalProps`)
- Never use `any` — use `unknown` and narrow with type guards when needed
- Use non-null assertion (`!`) only when the programmer is certain; prefer optional chaining (`?.`) and nullish coalescing (`??`) for safe access
- Access environment variables with bracket notation: `process.env['VAR_NAME']` (required for `noUncheckedIndexedAccess`)

### Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| React component files | `PascalCase` | `CourtGrid.tsx`, `BookingModal.tsx` |
| Non-component modules | `camelCase` | `db.ts`, `riotintoClient.ts`, `api.ts` |
| React components | `PascalCase` named export | `export function Dashboard()` |
| Functions & variables | `camelCase` | `loadData`, `weekOffset`, `slotMap` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `BASE_URL`, `SESSION_TTL_MS` |
| Props interfaces | `<Component>Props` | `AccountCardProps` |
| Context hooks | `use<ContextName>` | `useAuth` |
| Database columns (SQL) | `snake_case` | `account_id`, `cached_at` |
| TypeScript object fields | `camelCase` | mapped from DB `snake_case` |

### Formatting

There is no Prettier config; follow the existing style observed in the codebase:
- 2-space indentation
- Single quotes for strings in TypeScript/TSX
- Semicolons at end of statements
- Trailing commas in multi-line arrays/objects
- Use section comment banners to divide long files into logical sections:
  ```ts
  // ── Section Name ──────────────────────────────────────────────────
  ```

### React Components

- Use functional components with named exports (`export function Foo()`)
- Use `useState` for local UI state; `useEffect` for data fetching on mount
- Store API errors as `string` in local state (`useState('')`), clear with `setError('')` at start of each async operation, render inline as `<p className="text-red-400 ...">error</p>`
- Loading states use `animate-pulse` Tailwind skeletons
- Compose Tailwind classes with template literals and ternaries — no `clsx`/`cn` utility is used

### Error Handling

- **API routes (Hono):** Return explicit error JSON with status codes — `c.json({ error: 'message' }, 400)`. No centralized error middleware; each handler manages its own errors
- **Frontend async handlers:** Wrap in `try/catch`; set error state from caught `Error` message; always have a `finally` block to reset loading state
- **`ApiError`:** Use the existing `ApiError` class in `frontend/src/api.ts` when adding new API call wrappers — it extends `Error` with a `status: number` field
- **Intentional empty catches:** Acceptable when swallowing known non-critical errors (e.g., JSON parse failures on error responses); add a comment explaining intent
- **Concurrent requests:** Use `Promise.all` for parallel independent fetches; use `Promise.allSettled` when partial failure is acceptable

### API Layer (`frontend/src/api.ts`)

All frontend API calls must go through the `request<T>(path, options)` generic helper, which handles the `Authorization` header and `ApiError` throwing. Add new endpoints as thin wrappers:

```ts
export async function myEndpoint(params: MyParams): Promise<MyResult> {
  return request<MyResult>('/api/my-endpoint', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

### Database (`api/src/db.ts`)

- All DB access is synchronous (`better-sqlite3`)
- The `Db` type alias (`type Db = InstanceType<typeof Database>`) is used as the parameter type for every function — the DB instance is injected, never imported as a global
- Use SQL `INSERT ... ON CONFLICT(...) DO UPDATE SET ...` (UPSERT) for idempotent writes
- SQL column names use `snake_case`; map to `camelCase` TypeScript fields in the return type

### Maps and Lookups

- Prefer `Map` over plain objects for runtime O(1) lookups
- Use composite string keys (`"YYYY-MM-DD-turno-hora"`, `"dayIndex-time"`) to index multi-dimensional slot data

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `APP_PASSWORD` | `api/` | Plaintext password for auth; stored hashed in DB |
| `VITE_API_URL` | `frontend/` | API base URL injected at Vite build time |

Set these in `.env` locally (not committed) or via Docker Compose `environment:` / `build.args:`.

## Infrastructure Notes

- The Docker Compose setup uses an external Docker network named `npm` (for a Nginx reverse proxy running outside this compose file)
- CI (`.github/workflows/release.yml`) triggers on push to `main`, builds both images, and pushes to `registry.henriquesf.me`
- The Nix flake + direnv (`.envrc`) pins the development environment to Node.js 22 — run `direnv allow` once after cloning
