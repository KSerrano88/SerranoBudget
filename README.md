# Serrano Budget-inator

A personal budgeting and expense-tracking web application built with Next.js, PostgreSQL, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL (Neon serverless in production)
- **Auth:** NextAuth.js v5 (credentials provider)
- **Hosting:** Vercel

## Features

- Balance sheet with configurable date range and posted/unposted filters
- Add, edit, and delete transactions (single or bulk)
- Transaction history with date range and type filters
- Monthly totals with debit/credit breakdown by category
- Responsive sidebar navigation with branded logo

## Project Structure

```
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout (sidebar, auth, providers)
│   │   ├── page.tsx                # Redirects to /balance-sheet
│   │   ├── login/page.tsx          # Login page
│   │   ├── balance-sheet/page.tsx  # Main dashboard
│   │   ├── add-transaction/page.tsx# Add new transaction form
│   │   ├── history/page.tsx        # Transaction history with filters
│   │   ├── monthly-totals/page.tsx # Monthly debit/credit breakdown
│   │   └── api/                    # RESTful API routes
│   │       └── transactions/       # CRUD, summary, history, types, etc.
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, input, etc.)
│   │   ├── app-sidebar.tsx         # Sidebar navigation with branding
│   │   ├── transaction-table.tsx   # Sortable table with inline editing
│   │   ├── type-selector.tsx       # Transaction type dropdown + free text
│   │   ├── summary-bar.tsx         # Balance totals display
│   │   └── confirm-dialog.tsx      # Delete confirmation dialog
│   ├── lib/
│   │   ├── db.ts                   # PostgreSQL connection pool + helpers
│   │   ├── queries.ts              # All SQL queries (parameterized)
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── auth.ts                 # NextAuth.js configuration
│   └── middleware.ts               # Auth middleware (protects routes)
├── init.sql                        # PostgreSQL schema + seed data
├── docker-compose.yml              # Local PostgreSQL container
├── .env.example                    # Environment variable template
└── next.config.ts                  # Next.js configuration
```

## Local Development

### Prerequisites

- Node.js 20+
- Docker (via Colima or Docker Desktop)

### Setup

1. Clone the repo and install dependencies:
```bash
git clone https://github.com/KSerrano88/SerranoBudget.git
cd SerranoBudget
npm install
```

2. Start the PostgreSQL database:
```bash
docker run -d --name serrano-postgres \
  -e POSTGRES_DB=serranobudget \
  -e POSTGRES_USER=serrano \
  -e POSTGRES_PASSWORD=<your-dev-password> \
  -p 5432:5432 \
  -v "$(pwd)/init.sql:/docker-entrypoint-initdb.d/init.sql" \
  postgres:16-alpine
```

3. Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

4. Start the dev server:
```bash
npm run dev
```

5. Open http://localhost:3000 and sign in with your configured credentials.

## Database Schema

Two tables:

- **transactions** — all income and expense records (date, description, type, debit/credit, posted flag)
- **balance_carryover** — starting balance carried forward from a prior system

See `init.sql` for the full schema and seed data.

## Deployment

Deployed to Vercel with a Neon PostgreSQL database. Environment variables are configured in the Vercel dashboard. See `.env.example` for the required variables.

## Maintainer

KSerrano88 — https://github.com/KSerrano88
