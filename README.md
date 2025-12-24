# MySched Admin Panel

A secure administrative dashboard for managing class schedules, sections, instructors, and users. This system serves as the backend management interface for the MySched mobile application, developed as part of an undergraduate thesis on automated class scheduling systems.

## Overview

MySched Admin provides school administrators with tools to manage academic scheduling data that syncs with the MySched mobile app. The system handles CRUD operations for classes, sections, instructors, and user accounts while maintaining a complete audit trail of all changes.

### Core Capabilities

- **Class Management** — Create, edit, and organize class offerings with support for bulk imports via OCR
- **Section Assignment** — Assign instructors to sections with time slot and room configurations
- **User Administration** — Role-based access control for students, instructors, and administrators
- **Instructor Directory** — Centralized instructor profiles with department organization
- **Audit Logging** — Complete history of all system modifications for accountability
- **Real-time Dashboard** — Statistics, recent activity, and system health monitoring

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 (App Router) | Server/client React components with TypeScript |
| Backend | Supabase | PostgreSQL database, authentication, row-level security |
| State | TanStack Query | Data fetching, caching, and synchronization |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Animations | Framer Motion | UI transitions and micro-interactions |
| Testing | Vitest | Unit and integration testing (800+ tests) |

### Key Design Decisions

1. **Server-side validation** — All mutations go through API routes with admin verification
2. **Rate limiting** — Database-backed throttling via `public.hit_rate_limit` stored procedure
3. **Audit trail** — Every write operation is logged with user context and payload
4. **Virtualized lists** — React Virtuoso handles large datasets without performance degradation

## Project Structure

```
src/
├── app/
│   ├── admin/              # Protected admin routes
│   │   ├── classes/        # Class CRUD interface
│   │   ├── sections/       # Section management
│   │   ├── instructors/    # Instructor directory
│   │   ├── users/          # User management
│   │   ├── audit/          # Audit log viewer
│   │   ├── semesters/      # Semester configuration
│   │   ├── settings/       # Application settings
│   │   └── page.tsx        # Dashboard home
│   ├── api/                # REST endpoints (protected by requireAdmin)
│   └── login/              # Authentication flow
├── components/
│   ├── ui/                 # Reusable primitives (Button, Input, Dialog, etc.)
│   └── selectors/          # Dropdown components
└── lib/
    ├── constants.ts        # Shared application constants
    ├── query-config.ts     # React Query configuration
    ├── api-routes.ts       # Centralized API endpoint definitions
    ├── query-keys.ts       # Cache key factory
    ├── supabase-*.ts       # Database client utilities
    └── audit.ts            # Audit logging service
```

## Prerequisites

- Node.js 18.18 or higher (Node 20 recommended)
- npm 9+ (or equivalent package manager)
- Supabase project with applied schema

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/ndycode/mysched-admin-panel.git
cd mysched-admin-panel
npm install
```

### 2. Environment Configuration

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key |
| `SUPABASE_SERVICE_ROLE` | Service role key (keep confidential) |

**Optional variables:**

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API for OCR-based class import |
| `NEXT_PUBLIC_SITE_URL` | Production URL for OAuth redirects |
| `ALLOW_ANY_AUTH_AS_ADMIN` | Bypass admin check (development only) |
| `NEXT_ADMIN_EMAILS` | Comma-separated list of emails to auto-promote |

### 3. Database Setup

Apply the schema to your Supabase project:

**Option A: Using Supabase CLI**
```bash
supabase db push --file supabase/schema.sql
```

**Option B: SQL Editor**
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Execute the query

### 4. Create Admin User

After signing up through the application:

```sql
INSERT INTO admins (user_id) VALUES ('your-user-uuid');
```

### 5. Run Development Server

```bash
npm run dev
```

Access the application at `http://localhost:3000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Run production server |
| `npm test` | Run test suite |
| `npm run test:ci` | Run tests with coverage enforcement |
| `npm run format` | Format codebase with Prettier |
| `npm run format:check` | Verify formatting without changes |

## Testing

The test suite includes 800+ tests covering API routes, authentication flows, UI components, and utility functions.

```bash
npm test              # Interactive mode
npm test -- --run     # Single run
npm run test:ci       # With coverage thresholds
```

Coverage thresholds are set at 60% minimum for lines, functions, branches, and statements.

## Deployment

### Vercel

1. Import repository to Vercel
2. Configure environment variables in project settings
3. Deploy

### Manual Deployment

1. Set environment variables on your hosting platform
2. Run `npm run build`
3. Start with `npm start`

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] Admin user created and verified
- [ ] Rate limiting function deployed
- [ ] Audit logging confirmed operational

## Security Considerations

- Service role key is never exposed to the client
- All API routes verify admin session before processing
- Rate limiting prevents abuse of endpoints
- Audit payloads are sanitized (passwords and tokens are never logged)
- CSRF protection enabled on state-changing operations

## Authors

**Neil Daquioag** — Developer  
**Raymond Zabiaga** — Researcher

## Acknowledgments

This project was developed as part of an undergraduate thesis at [Your University]. We acknowledge the following open-source projects that made this work possible:

- [Next.js](https://nextjs.org/) — React framework for production
- [Supabase](https://supabase.com/) — Open source Firebase alternative
- [TanStack Query](https://tanstack.com/query) — Data synchronization for React
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) — Animation library for React

---

For questions or issues, please open a GitHub issue or contact the development team.
