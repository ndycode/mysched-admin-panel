# Repository Guidelines

## Project Structure & Module Organization
- Next.js 15 App Router with TypeScript lives in `src/app`; admin UI is in `src/app/admin`, API handlers in `src/app/api`, and auth flows in `src/app/auth|login|logout`.
- Shared UI primitives sit in `src/components`, hooks in `src/hooks`, utilities (Supabase clients, audit, rate limiting, env helpers) in `src/lib`, and shared types in `src/types`.
- Public assets are under `public`. Database schema and stored procs are in `supabase/schema.sql`; keep them in sync with API changes.
- Imports favor the `@/` alias (see `tsconfig.json`/`vitest.config.ts`); prefer referencing modules through it instead of relative `../../` chains.

## Build, Test, and Development Commands
- `npm run dev` starts the Turbopack dev server on http://localhost:3000.
- `npm run build` produces the production bundle (fails on type or route errors); `npm run start` serves the built output.
- `npm run lint` runs the Next/TypeScript ESLint flat config; fix warnings before sending a PR.
- `npm test` runs Vitest in jsdom; `npm run test:ci` enforces coverage (text + HTML/LCOV output). Add `--runInBand` if tests touch shared state.

## Coding Style & Naming Conventions
- TypeScript is `strict`; favor explicit types on exports and async boundaries. Two-space indentation and single quotes in TS/TSX match the existing style.
- React components use PascalCase filenames; hooks start with `use*`; route handlers follow the App Router folder pattern (`route.ts`, `layout.tsx`, `page.tsx`).
- Keep server-only secrets out of client bundles; mark client components with `'use client'` only when needed. Use small focused modules in `src/lib` rather than large utility grabs.

## Testing Guidelines
- Vitest + Testing Library power unit/integration coverage; matchers from `@testing-library/jest-dom` are preloaded in `vitest.setup.ts`.
- Coverage thresholds are enforced at 60% for lines/functions/branches/statements; covered paths include `src/app/api`, `src/components`, `src/hooks`, `src/lib`, and auth/login flows.
- Place specs next to code (`*.test.tsx`) or under `__tests__`; write user-facing assertions (DOM text, network calls, redirects). Run focused suites with `npm test -- path/to/file.test.tsx`.

## Commit & Pull Request Guidelines
- Use short, imperative commits scoped by area (e.g., `admin: tighten audit logging`, `api: handle missing token`). Avoid long, multi-topic commits.
- PRs should include summary, test results (`npm test`, `npm run lint`), and screenshots/GIFs for UI changes. Call out env var additions or schema edits touching `supabase/schema.sql`.
- Link related issues or task IDs and note any follow-up work required post-merge (migrations, feature flags, cache invalidation).

## Security & Configuration Tips
- Copy `.env.local.example` to `.env.local`; never commit real keys. Keep `SUPABASE_SERVICE_ROLE` and Gemini keys server-only; `ALLOW_ANY_AUTH_AS_ADMIN` is for local debugging only.
- Supabase schema changes require running `supabase db push --file supabase/schema.sql` locally and ensuring deployed environments apply the same migration.
- API routes depend on `requireAdmin` and audit logging in `src/lib/audit`; maintain those checks when adding endpoints or mutations.
