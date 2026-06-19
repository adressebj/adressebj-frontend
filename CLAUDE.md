# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js **16.2.6** (App Router) · React **19.2.4** · TypeScript (strict) · Tailwind CSS **v4** · Jest + React Testing Library. Node version pinned in `.nvmrc` (22.14.0).

The **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts` + `babel-plugin-react-compiler`). Do not hand-add `useMemo`/`useCallback` for performance — the compiler handles memoization. Heed the warning in `AGENTS.md`: this Next.js version differs from training data; consult `node_modules/next/dist/docs/` before writing framework code.

Tailwind v4 is configured via PostCSS (`postcss.config.mjs`) with no `tailwind.config.*` — theme tokens live in CSS (`src/app/globals.css`).

## Commands

```bash
npm run dev          # dev server (defaults to mock mode unless env set)
npm run build        # production build
npm run lint         # eslint (flat config, eslint.config.mjs)
npm test             # jest, serial (--runInBand)
npm run test:watch   # jest watch mode
npx jest src/path/to/file.test.tsx            # run one test file
npx jest -t "substring of test name"          # run tests matching a name
```

Tests run **serially on purpose** (`maxWorkers: 1` in `jest.config.ts`): the mock layer shares mutable module-level state and adds artificial latency, so parallel workers cause flaky timeouts and OOM. Don't "fix" this by re-enabling parallelism.

## Architecture

This is the **frontend only**. The product (AdresseBJ — digital addresses for Benin) is French-language: UI strings, comments, and error messages are in French. Full specs live in the root markdown files (`Cahier_De_Charge_AdresseBJ_v5.md`, `AdresseBJ_CdC_Frontend.md`, `AdresseBJ_CdC_Backend.md`).

### API layer — `src/lib/api.ts`
The single source of truth for backend communication. `apiFetch<T>()` dispatches to either `realFetch` (hits `${NEXT_PUBLIC_API_URL}/api/v1<path>`, unwraps the `{ data }` envelope) or `mockFetch` depending on `NEXT_PUBLIC_USE_MOCK`. The **mock router replicates the real backend's routes and error shapes**, so the switch is transparent to callers — keep both paths in sync when adding endpoints.

- `export const api = { ... }` is the typed call surface (e.g. `api.publicAddress(code)`, `api.createAddress(input)`). Page/component code calls these helpers, not `apiFetch` directly.
- Errors throw `ApiError(status, code, message, extra)`. Catch and switch on `.code`.
- Auth modes per call: `'jwt'` (Bearer from localStorage), `'apiKey'`, or `'none'`.
- Mock latency is `800ms` in the app, `0` under tests.

### Mock data — `src/mocks/data.ts`
Mutable module-level arrays seeded at import. `createAddress()` and friends mutate them, so `jest.setup.ts` calls `resetMockData()` in `beforeEach` to prevent cross-test leakage. The mock OTP is `123456`.

### Auth & roles
JWT stored in `localStorage` under `adressebj_token`. `src/lib/auth.ts` handles token storage + client-side JWT decode; `useAuth()` (`src/hooks/useAuth.ts`) exposes `isAuthenticated` and role booleans. Roles (`src/types/api.ts`): `CREATOR` (habitant), `MODERATOR`, `ADMIN`. `useRequireAdmin()` guards admin-only routes (moderators get redirected to `/admin`, not an error screen). Always gate redirects on `isReady` to avoid auth-flash.

### Routing (`src/app/`)
- Public: `/`, `/a/[code]` (public address view), `/carte`, `/login`, `/auth`, `/forgot-password`
- `/dashboard/*` — habitant area (create/edit/print addresses, profile, notifications)
- `/admin/*` — back-office (quartiers, api-keys, moderation queue, reports, habitants, moderators)

### Other
- **PWA**: `src/app/manifest.ts`, `public/sw.js`, `ServiceWorkerRegistration` component, `public/offline.html`, push via `usePushNotifications`.
- **Maps**: Leaflet (`src/components/map/*`); geocoding via Nominatim (`src/lib/nominatim.ts`).
- **Images**: Cloudinary signed uploads (`src/lib/cloudinary.ts`, `api.uploadSignature()`).
- Path alias: `@/*` → `src/*`.

### Env vars
`NEXT_PUBLIC_USE_MOCK` (`'true'` to use the in-memory mock backend), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
