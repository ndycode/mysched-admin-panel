# MySched Admin

MySched Admin is a secure dashboard for managing class schedules, sections, users, and operational health data for the MySched platform. The app is built with Next.js 15 (App Router) and Supabase, and provides both interactive admin tooling and hardened REST API routes consumed by the UI.

## Architecture overview

- **Framework**: Next.js 15 App Router with TypeScript and React Server/Client Components.
- **Data layer**: Supabase Postgres for relational data, authentication, and row-level security. All server actions use the Supabase service client for privileged operations.
- **State/query management**: [`@tanstack/react-query`](https://tanstack.com/query) caches expensive admin fetches (classes, sections) and unifies refetch logic across dialogs.
- **Authentication & authorization**: Supabase auth cookies verified in middleware and API routes via `requireAdmin`. Admin membership is stored in the `admins` table.
- **Audit & observability**: Every mutating API call records an entry through `src/lib/audit`. Errors are captured with structured logging helpers.
- **Rate limiting**: API routes call a Postgres stored procedure (`public.hit_rate_limit`) backed by the `rate_limit_counters` table so limits persist across restarts and multiple instances.
- **Frontend**: Tailwind-esque utility classes with bespoke components (`src/components/ui`). The admin shell includes collapsible navigation, notification polling, and contextual dialogs.

## Prerequisites

- Node.js 18.18+ (Node 20 recommended)
- npm 9+
- A Supabase project with the schema in `supabase/schema.sql`

## Initial setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the following keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE` (server-only, never expose to browsers)
   - `GEMINI_API_KEY` (server-only; required to run OCR for "Import classes from image")
   - `NEXT_PUBLIC_SITE_URL` (optional, used for redirects)
   - `ALLOW_ANY_AUTH_AS_ADMIN` (optional; when `true` any signed-in user bypasses admin checks - **only use for local testing**)
   - `SUPABASE_ALLOW_LOCAL_DEFAULTS` (optional; set to `1` to reuse the built-in local Supabase credentials when running local dev; ignored in production and on hosted/CI environments such as Vercel)
   - `SUPABASE_LOCAL_URL` (optional override for the local Supabase fallback host, e.g. `http://host.docker.internal:54321` when developing inside a container)
   - `SUPABASE_LOCAL_ANON_KEY` / `SUPABASE_LOCAL_SERVICE_ROLE_KEY` (optional overrides for the generated development credentials when using a custom local Supabase instance)
   - `NEXT_ADMIN_EMAILS` (optional comma-separated allowlist of emails auto-promoted to admin on sign-in)
   - `GEMINI_MODEL` and `GEMINI_API_URL` (optional; override the default Gemini model or endpoint for OCR)
   - `NEXT_PUBLIC_ENABLE_TEST_PAGE` (optional flag to expose `/test`; defaults to disabled in production builds)

3. **Apply the database schema**
   ```bash
   supabase db push --file supabase/schema.sql
   ```
   This creates all required tables, policies, and the `public.hit_rate_limit` function used for distributed throttling.

4. **Create an admin user**
   - Sign up through your Supabase Auth instance.
   - Insert the user id into the `admins` table so `requireAdmin` recognises the session.

## Running locally

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000). Supabase credentials are read at runtime so you can sign in via the hosted auth UI and immediately access the admin tools.

## Testing

Vitest powers the test suite with **808+ tests across 96 test files** covering API routes, login flows, UI primitives, and client hooks.

```bash
npm test -- --run          # run all tests
npm run test:ci            # run with coverage enforcement
```

Key coverage areas:
- **API Routes**: classes, sections, users, semesters, settings, audit log, notifications, geo, edge-info, env-status, status endpoints
- **Security**: Admin gatekeeping, CSRF protection, rate limiting, audit payload sanitisation (passwords/tokens never logged)
- **Auth Flows**: Login redirect, admin-only layout guard, middleware protection
- **UI Components**: Toast notifications, shared UI primitives, dialogs, tables, buttons
- **Hooks**: `useLocalStorage`, `usePageSize`, `useSmoothProgress`, filter persistence
- **Utilities**: Supabase error helpers, schedule import parsing, settings schemas, OCR module schemas
- **Coverage Thresholds**: 60% minimum for lines/functions/branches/statements

## Formatting

Prettier is configured for 2-space indentation and single quotes. Format the repo with:

```bash
npm run format       # rewrite files
npm run format:check # verify formatting without changes
```

## Deployment checklist

- Set the same Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`) in your hosting provider.
- Run migrations using `supabase/schema.sql` (or keep them managed through Supabase migrations).
- Configure a CI pipeline to execute `npm test -- --run` before merging.
- Optionally add monitoring (e.g., Sentry) by instrumenting the server handlers in `src/lib/log.ts`.

## Key directories

- `src/app/admin` – Admin UI routes, dialogs, and React Query enabled screens.
- `src/app/api` – REST endpoints protected by `requireAdmin`.
- `src/lib` – Shared utilities (Supabase clients, rate limiter, audit logging, HTTP error helpers).
- `supabase/schema.sql` – Canonical database schema, including the rate limiter tables/functions.

For additional API details, see inline JSDoc within the route handlers.
