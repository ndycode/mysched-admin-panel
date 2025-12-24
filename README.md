# 🗓️ MySched Admin Panel

<div align="center">

**A modern, secure admin dashboard for managing class schedules, sections, instructors, and users.**

Built as part of the **MySched** thesis project — a class scheduling mobile application.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running Locally](#-running-locally)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [License](#-license)

---

## 📋 About The Project

**MySched Admin Panel** is the administrative backend for the MySched mobile application. It provides a comprehensive dashboard for school administrators to manage:

- **Class Schedules** — Create, edit, and organize class offerings
- **Sections** — Manage class sections with instructor assignments
- **Instructors** — Track instructor information and availability
- **Users** — Control user access and permissions
- **Audit Logs** — Monitor all system changes for accountability

This project is developed as part of an academic thesis on class scheduling systems.

---

## ✨ Features

### 👩‍💼 User Management
- Add, edit, and delete users (Students, Instructors, Admins)
- Role-based access control
- Bulk operations support

### 📚 Class Management
- Create and manage class offerings
- Import classes from images using AI/OCR
- Filter by semester, section, and instructor

### 📅 Section Management
- Assign instructors to sections
- Set time slots and rooms
- Track enrollment status

### 👨‍🏫 Instructor Directory
- Comprehensive instructor profiles
- Department organization
- Workload tracking

### 📊 Dashboard & Analytics
- Real-time statistics
- Recent activity feed
- System health monitoring

### 🔒 Security Features
- Admin-only access with Supabase Auth
- Rate limiting to prevent abuse
- Complete audit trail of all changes
- CSRF protection

### 🌙 UI/UX
- **Dark mode support** — Full dark/light theme compatibility
- **Responsive design** — Works on desktop and tablet
- **Smooth animations** — Framer Motion powered transitions
- **Virtualized lists** — Handle thousands of records efficiently

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Styling** | Tailwind CSS |
| **State Management** | TanStack Query (React Query) |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form |
| **Testing** | Vitest |
| **Virtualization** | React Virtuoso |

---

## 📁 Project Structure

```
mysched-admin-panel/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── classes/     # Class management
│   │   │   ├── sections/    # Section management
│   │   │   ├── instructors/ # Instructor directory
│   │   │   ├── users/       # User management
│   │   │   ├── audit/       # Audit log viewer
│   │   │   ├── semesters/   # Semester management
│   │   │   ├── settings/    # App settings
│   │   │   └── page.tsx     # Dashboard home
│   │   ├── api/             # REST API endpoints
│   │   └── login/           # Authentication pages
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── selectors/       # Dropdown selectors
│   └── lib/
│       ├── constants.ts     # Shared constants
│       ├── query-config.ts  # React Query config
│       ├── api-routes.ts    # API endpoint definitions
│       ├── query-keys.ts    # Cache key definitions
│       └── supabase-*.ts    # Supabase client utilities
├── supabase/
│   └── schema.sql           # Database schema
├── public/                  # Static assets
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18.18+** (Node 20 recommended)
- **npm 9+** or yarn/pnpm
- **Supabase account** — [Create one for free](https://supabase.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ndycode/mysched-admin-panel.git
   cd mysched-admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see [Environment Variables](#-environment-variables))

4. **Set up the database** (see [Database Setup](#-database-setup))

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Visit [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE` | Supabase service role key (⚠️ keep secret!) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for OCR import | — |
| `NEXT_PUBLIC_SITE_URL` | Public URL for redirects | `localhost:3000` |
| `ALLOW_ANY_AUTH_AS_ADMIN` | Bypass admin check (dev only!) | `false` |
| `NEXT_ADMIN_EMAILS` | Auto-promote these emails to admin | — |

> ⚠️ **Security Warning**: Never commit `.env.local` to git. The `.gitignore` already excludes it.

---

## 🗄️ Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com/)

2. **Apply the schema** using one of these methods:

   **Option A: Supabase CLI**
   ```bash
   supabase db push --file supabase/schema.sql
   ```

   **Option B: SQL Editor**
   - Go to your Supabase Dashboard → SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Run the query

3. **Create your first admin user**
   - Sign up through the app's login page
   - In Supabase Dashboard, insert your user ID into the `admins` table:
   ```sql
   INSERT INTO admins (user_id) VALUES ('your-user-id-here');
   ```

---

## 💻 Running Locally

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

### Formatting
```bash
npm run format          # Auto-format all files
npm run format:check    # Check formatting without changes
```

### Type Checking
```bash
npx tsc --noEmit
```

---

## 🧪 Testing

The project includes **800+ tests** covering API routes, UI components, and business logic.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run specific test file
npm test -- src/lib/__tests__/utils.test.ts
```

### Test Coverage Areas
- ✅ API Routes (CRUD operations)
- ✅ Authentication flows
- ✅ Security (rate limiting, CSRF)
- ✅ UI Components
- ✅ Custom hooks
- ✅ Utility functions

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com/)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Set these in your hosting provider:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
```

### Deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema applied
- [ ] Admin user created
- [ ] Test login flow works
- [ ] Audit logging functional

---

## 📄 License

This project is developed for academic/thesis purposes.

---

## 👥 Authors

**Neil Daquioag** — Developer  
**Raymond Zabiaga** — Researcher

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the incredible React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [TanStack Query](https://tanstack.com/query) for data fetching
- [Framer Motion](https://www.framer.com/motion/) for animations

---

<div align="center">

**Made with ❤️ for MySched Thesis Project**

</div>
