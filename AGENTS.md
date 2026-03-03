# Serrano Budget-inator — Agent Context

Personal budgeting web app. Originally a PHP LAMP-stack application (~2011), fully rewritten as a modern Next.js app deployed on Vercel with Neon PostgreSQL.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui (new-york style), Tailwind CSS 4 |
| Auth | NextAuth.js v5 (beta), JWT sessions, Credentials provider |
| Database | PostgreSQL 16 (pg driver) |
| Icons | Lucide React |
| Toasts | Sonner |
| Hosting | Vercel (free tier) |
| Database hosting | Neon PostgreSQL (free tier) |
| Local dev DB | Docker (postgres:16-alpine) via Colima |

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | App URL (not needed on Vercel — auto-detected) |
| `APP_USERNAME` | Single-user login username |
| `APP_PASSWORD` | Single-user login password |

## Database Schema

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| ID_TRANSACTIONS | SERIAL PK | Auto-increment |
| TRANSACTION_DATE | DATE | |
| CHECK_NMBR | VARCHAR(10) | Check number, often empty |
| DESCRIPTION | VARCHAR(100) | |
| NOTES | VARCHAR(200) | |
| MULTI_PART_TRAN_TOTAL | DECIMAL(10,2) | Default 0.00 |
| POSTED_FLAG | SMALLINT | 0 = unposted, 1 = posted |
| TRAN_TYPE | VARCHAR(50) | e.g., Income, Housing, Food, Auto |
| DEBIT | DECIMAL(10,2) | Default 0.00 |
| CREDIT | DECIMAL(10,2) | Default 0.00 |

### `balance_carryover`
| Column | Type | Notes |
|--------|------|-------|
| ID_CARRYOVER | SERIAL PK | Auto-increment |
| ENTRY_DATE | DATE | |
| AMOUNT | DECIMAL(10,2) | Starting balance carried forward |
| IS_ACTIVE | SMALLINT | 0 or 1 |

Only one active carryover row is expected (IS_ACTIVE = 1).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (sidebar + auth wrapper)
│   ├── page.tsx                # Redirects to /balance-sheet
│   ├── login/page.tsx          # Login form
│   ├── balance-sheet/page.tsx  # Main dashboard
│   ├── add-transaction/page.tsx# New transaction form
│   ├── history/page.tsx        # Filterable transaction history
│   ├── monthly-totals/page.tsx # Monthly debit/credit by category
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth handlers
│       └── transactions/
│           ├── route.ts          # GET list, POST create
│           ├── [id]/route.ts     # PATCH update, DELETE single
│           ├── summary/route.ts  # GET balance summary
│           ├── types/route.ts    # GET distinct transaction types
│           ├── history/route.ts  # GET filtered history
│           ├── monthly-totals/route.ts # GET monthly breakdown
│           ├── bulk/route.ts     # DELETE multiple
│           └── last/route.ts     # DELETE last transaction
├── components/
│   ├── app-sidebar.tsx         # Navigation sidebar
│   ├── summary-bar.tsx         # Balance summary cards
│   ├── transaction-table.tsx   # Sortable table with inline edit
│   ├── type-selector.tsx       # Transaction type dropdown
│   └── ui/                     # shadcn/ui primitives
├── hooks/
│   └── use-mobile.ts           # Mobile breakpoint detector (768px)
├── lib/
│   ├── auth.ts                 # NextAuth v5 config (trustHost: true)
│   ├── db.ts                   # pg Pool + uppercase column transform
│   ├── queries.ts              # All parameterized SQL queries
│   ├── types.ts                # TypeScript interfaces
│   ├── format.ts               # Currency/date formatters
│   └── utils.ts                # cn() class merge helper
└── middleware.ts               # Auth guard (redirects to /login)
```

## Architecture Patterns

### Database Layer
- `db.ts` creates a `pg.Pool` from `DATABASE_URL`
- Custom type parser converts PostgreSQL NUMERIC (OID 1700) to JS numbers
- The `query<T>()` wrapper transforms all column names from lowercase to UPPERCASE to match TypeScript interfaces
- All queries live in `queries.ts` — API routes never contain raw SQL

### Query Conventions
- PostgreSQL parameterized queries: `$1, $2, $3...` (not `?`)
- PostgreSQL functions: `EXTRACT(MONTH FROM date)`, `EXTRACT(YEAR FROM date)` (not MySQL `MONTH()`, `YEAR()`)
- Rollup: `GROUP BY ROLLUP(...)` (not MySQL `WITH ROLLUP`)
- Result access: `result.rows` (pg driver pattern)
- Return types need casting: `result.rows as unknown as Array<{...}>` for typed results

### Authentication
- NextAuth v5 wraps middleware with `auth()` callback
- Cookie name is `authjs.session-token` (v5 convention, NOT `next-auth.session-token` from v4)
- Single-user: compares credentials against `APP_USERNAME` / `APP_PASSWORD` env vars
- JWT strategy (no database session store)
- `trustHost: true` required for Vercel deployment

### API Routes
All transaction routes are RESTful:
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/transactions?days=30&postStatus=all` | List transactions |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/[id]` | Update transaction |
| DELETE | `/api/transactions/[id]` | Delete single |
| GET | `/api/transactions/summary?days=30&postStatus=all` | Balance totals |
| GET | `/api/transactions/types` | Distinct TRAN_TYPE values |
| GET | `/api/transactions/history?startDate=...&endDate=...` | Filtered history |
| GET | `/api/transactions/monthly-totals` | Monthly rollup (13 months) |
| DELETE | `/api/transactions/bulk` | Delete multiple (body: `{ ids }`) |
| DELETE | `/api/transactions/last` | Delete highest ID |

### UI Patterns
- shadcn/ui "new-york" style with Radix UI primitives
- Brand colors: navy gradient (`#1a2876` to `#000244`), amber accent (`text-amber-400`)
- Toast notifications via Sonner
- Responsive: sidebar collapses on mobile (768px breakpoint)
- Root layout checks `auth()` server-side to conditionally render sidebar

## TypeScript Interfaces

```typescript
interface Transaction {
  ID_TRANSACTIONS: number;
  TRANSACTION_DATE: string;
  CHECK_NMBR: string;
  DESCRIPTION: string;
  NOTES: string;
  MULTI_PART_TRAN_TOTAL: number;
  POSTED_FLAG: 0 | 1;
  TRAN_TYPE: string;
  DEBIT: number;
  CREDIT: number;
}

interface TransactionInput {
  TRANSACTION_DATE: string;
  CHECK_NMBR?: string;
  DESCRIPTION: string;
  NOTES?: string;
  MULTI_PART_TRAN_TOTAL?: number;
  POSTED_FLAG: 0 | 1;
  TRAN_TYPE: string;
  DEBIT: number;
  CREDIT: number;
}

interface BalanceSummary {
  SUM_DEBIT: number;
  SUM_CREDIT: number;
  DIFFERENCE: number;
}

interface TotalBalance extends BalanceSummary {
  TOTAL_BAL: number;
}

interface PostedBalance {
  POSTED_DEBIT: number;
  POSTED_CREDIT: number;
  TOTAL_POSTED_BAL: number;
}

interface CarryOver {
  CARRYOVER_AMOUNT: number;
}

interface MonthlyRollup {
  month: number;
  year: number;
  monthName: string;
  debits: Array<{ TRAN_TYPE: string; SUM_DEBIT: number }>;
  credits: Array<{ TRAN_TYPE: string; SUM_CREDIT: number }>;
}
```

## Local Development

### Prerequisites
- **Colima** — lightweight Docker runtime for macOS (no Docker Desktop needed)
- **docker-compose** — installed via Homebrew as a Docker CLI plugin

### Docker / Colima Setup
Colima provides the Docker daemon. The `docker-compose` Homebrew formula installs as a CLI plugin. The Docker config at `~/.docker/config.json` must include the plugin path:
```json
{
  "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"]
}
```

### Starting the Environment
```bash
# 1. Start Colima (Docker runtime)
colima start

# 2. Start PostgreSQL container
docker compose up -d

# 3. Install dependencies
npm install

# 4. Create .env.local from template (first time only)
cp .env.example .env.local
# Then edit APP_USERNAME, APP_PASSWORD, and NEXTAUTH_SECRET

# 5. Run dev server
npm run dev
# → http://localhost:3000
```

The `init.sql` file seeds the database with realistic transactions from Oct 2025 - Feb 2026 on first container start.

## Known Gotchas
- `.github/copilot-instructions.md` contains outdated PHP/Laravel instructions — ignore it
- NextAuth v5 is still in beta — import from `next-auth` (not `next-auth/next`)
- The `query()` wrapper in `db.ts` uppercases all column names, so SQL aliases must be written lowercase (they'll be auto-transformed)
- PostgreSQL DECIMAL columns are returned as strings by default — the custom type parser in `db.ts` handles the conversion to numbers
- Production uses Neon's serverless PostgreSQL; the `pg` driver works with both local Docker and Neon without changes
