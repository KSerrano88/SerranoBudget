# Copilot Instructions

Repository: KSerrano88/SerranoBudget
Default branch: main

This app is a **Next.js 16** project. See `AGENTS.md` in the repo root for full project context, architecture, database schema, API routes, and conventions.

## Quick Start
```bash
docker compose up -d   # Start PostgreSQL
npm install            # Install dependencies
npm run dev            # http://localhost:3000
```

## Key Files
- `AGENTS.md` — Comprehensive project documentation for AI agents
- `src/lib/queries.ts` — All SQL queries
- `src/lib/db.ts` — Database connection
- `src/lib/types.ts` — TypeScript interfaces
- `src/app/api/transactions/` — REST API routes
