# Claude Code Instructions

Read `AGENTS.md` for full project context, architecture, and conventions.

## Quick Reference
- **Stack:** Next.js 16 + React 19 + PostgreSQL + NextAuth v5 + shadcn/ui + Tailwind CSS
- **Local dev:** `docker compose up -d` then `npm run dev`
- **Database:** PostgreSQL 16 (local Docker), Neon PostgreSQL (production)
- **Deployment:** Vercel (auto-deploys from `main` branch)
- **Auth:** Single-user credentials from env vars (`APP_USERNAME`, `APP_PASSWORD`)

## Key Paths
- `src/lib/queries.ts` — All SQL queries (PostgreSQL parameterized with `$1, $2...`)
- `src/lib/db.ts` — Connection pool + uppercase column name transform
- `src/lib/types.ts` — TypeScript interfaces for all data shapes
- `src/lib/auth.ts` — NextAuth v5 config
- `src/app/api/transactions/` — All REST API routes
- `init.sql` — Schema + seed data

## Conventions
- Column names are UPPERCASE in all interfaces and queries (e.g., `ID_TRANSACTIONS`, `TRAN_TYPE`)
- The `db.ts` query wrapper auto-transforms lowercase PostgreSQL column names to uppercase
- API routes import only from `src/lib/queries.ts` — never write SQL directly in route files
- UI components use shadcn/ui primitives from `src/components/ui/`
