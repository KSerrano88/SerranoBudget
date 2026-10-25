# Serrano Budget-inator

A personal budgeting app for one user. Track income, expenses, transaction types,
and posted balances. The app uses Next.js, PostgreSQL, and shadcn/ui.

## Features

- Balance sheet with a configurable date range and all, posted, or unposted filters.
- Transaction entry with ranked transaction types and support for new types.
- [Recurring transactions](#recurring-transactions) with saved templates, batch review, duplicate warnings, and temporary highlights for new rows.
- Inline editing and bulk deletion of selected transactions.
- Bulk saves that commit all rows or roll back all changes.
- Transaction history with date, exact type, and partial type filters.
- Monthly debit and credit totals by type, from the current month back through January of the prior year.
- Bar, line, and pie charts with date and type filters. Chart type selections can be saved in the browser.
- Responsive navigation and a confirmation dialog for transaction deletion.

## Technology

| Area | Technology |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | shadcn/ui, Radix UI, Tailwind CSS 4, Lucide icons, Sonner notifications |
| Charts | Recharts |
| Database | PostgreSQL 16 with the `pg` driver; Neon in production |
| Validation | Zod 4 |
| Authentication | NextAuth.js v5 beta, credentials provider, JWT sessions |
| Tests | Vitest, Testing Library, jsdom, PostgreSQL integration tests |
| Hosting | Vercel |

See [package.json](package.json) and [package-lock.json](package-lock.json) for package versions.

## Local development

### Requirements

- Node.js 20.19 or later in the Node.js 20 release line, or Node.js 22.12 or later.
- npm.
- Docker with Compose. On macOS, use Colima or Docker Desktop.

GitHub Actions currently runs tests with Node.js 20 and PostgreSQL 16.

### Setup

1. Clone the repository and install the locked dependencies:

   ```bash
   git clone https://github.com/KSerrano88/SerranoBudget.git
   cd SerranoBudget
   npm ci
   ```

2. Start Docker. If you use Colima, run `colima start` first. Then start the database:

   ```bash
   docker compose up -d
   docker compose exec postgres pg_isready -U serrano -d serranobudget
   ```

   Wait until PostgreSQL reports that it accepts connections. Compose exposes the
   database on port `5432` and stores its data in the `postgres_data` named volume.
   Its local credentials match `.env.example`.

3. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`. Set `APP_USERNAME` and `APP_PASSWORD` for your app login.
   Replace the placeholder `NEXTAUTH_SECRET` with a random value. You can generate
   one with:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open [localhost:3000](http://localhost:3000) and sign in with your app credentials.

Next.js loads `.env.local`. Environment files are excluded from Git, except for
`.env.example`. The app login is separate from the PostgreSQL login.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. The example matches the Compose database. |
| `NEXTAUTH_SECRET` | Secret used for authentication sessions. Replace the example value. |
| `NEXTAUTH_URL` | App URL. Use `http://localhost:3000` locally. Vercel detects its URL automatically. |
| `APP_USERNAME` | Username for the single app user. |
| `APP_PASSWORD` | Password for the single app user. |
| `TEST_DATABASE_URL` | Optional connection string for PostgreSQL integration tests. Set it in the test command. |

### Database initialization

On the first start with an empty data volume, PostgreSQL runs [init.sql](init.sql)
and [the recurring transaction migration](migrations/001-recurring-transactions.sql).
These scripts create the schema, add a carryover balance, and load sample transactions
from October 2025 through February 2026. A recent date filter may show no sample
rows. Increase **Prior Days** or select **Unposted** to view them.

The initialization scripts do not run again when you restart an existing volume.
Run `npm run db:migrate` after configuring `.env.local` to add recurring transaction
tables to an existing database.
Changing `.env.local` also does not change the PostgreSQL user or password stored
in that volume. `docker compose down` stops the database and preserves its data.

[seed-5yr.sql](seed-5yr.sql) is an optional development seed for January 2021 through
March 8, 2026. It clears the transaction table before loading data. Use it only
with a disposable development database.

## Commands and tests

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build and run the Next.js TypeScript check. |
| `npm start` | Serve an existing production build. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Check TypeScript without building the app. |
| `npm test` | Run the automated tests once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run db:migrate` | Add the recurring transaction schema to the configured database. |

The build uses `next/font/google` to load Inter. It needs access to Google Fonts
when those font files are not cached.

### PostgreSQL integration tests

`npm test` runs validation, route, query, rate-limit, and browser loading tests.
Without `TEST_DATABASE_URL`, it skips the PostgreSQL integration tests. The
browser loading tests use jsdom and do not need a running app server.

Create a separate test database in the local Compose container once:

```bash
docker compose exec postgres createdb -U serrano serranobudget_test
```

Run the full suite:

```bash
TEST_DATABASE_URL=postgresql://serrano:serrano_dev@localhost:5432/serranobudget_test npm test
```

Adjust the connection string if you changed the database credentials or port.
Each integration suite creates and removes its own schema. The database user
needs permission to create schemas. Tests cover bulk save rollback and balance
sheet results, including a concurrent write during a read.

[The test workflow](.github/workflows/test.yml) runs on all pull requests and
pushes to `main`. It starts PostgreSQL 16 and runs the full test suite. It does
not run lint or a production build.

### Manual security checks

[security-tests.sh](security-tests.sh) checks authentication, input validation,
and response headers against a running app at `http://localhost:3000`:

```bash
bash security-tests.sh
```

The script requires Bash, curl, and Python 3. It currently uses the hard-coded
app credentials `admin` / `admin`. Use an isolated local app and disposable
database for this check. These credentials are test values, not deployment
credentials. The script sends write and delete requests to test access controls.

If authentication fails, the script skips its authenticated checks. It also does
not return a failing exit code for every reported failure. Read the full output;
a zero exit code does not confirm that all security checks passed. The script
does not yet cover `/api/transactions/balance-sheet`.

## Data and read behavior

The schema has four tables:

- `transactions`: dates, descriptions, notes, types, debit and credit amounts, and posted flags.
- `balance_carryover`: starting balances. The app expects one active row with `IS_ACTIVE = 1`.
- `recurring_templates`: saved defaults for recurring income and expenses.
- `recurring_batches`: saved request details and inserted row IDs. Retrying a saved request returns the same result without adding rows again.

`transactions.RECURRING_TEMPLATE_ID` links generated transactions to their templates.
Deleting a template clears this link and preserves the transactions.

The balance sheet loads rows and all totals through one request to
`/api/transactions/balance-sheet`. One SQL statement reads them from one database
snapshot, so a concurrent write cannot split the result across different states.
The page cancels outdated requests and shows **Retry** if loading fails.

For **All** and **Posted**, the date filter is an inclusive lower limit. It does
not exclude future-dated transactions. **Unposted** includes all unposted rows,
regardless of date. Range totals use the displayed rows. Overall and posted
balances use all dates and include the active carryover amount.

Create, single update, and bulk update use the same validation rules. Dates must
be valid calendar dates in `YYYY-MM-DD` format. Text limits match the database:
check number 10, description 100, notes 200, and transaction type 50 characters.
Bulk updates accept 1–500 rows. Duplicate IDs are rejected before writes.
A missing ID or a database error rolls back the whole bulk save.

## Transaction routes

All transaction routes require an authenticated session. Read dates use
`YYYY-MM-DD`. Balance sheet filters default to `days=30` and `postStatus=all`.
Valid posted states are `all`, `posted`, and `unposted`; valid days are 0–3650.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/transactions/balance-sheet` | Rows and all balance totals in one result. |
| GET | `/api/transactions` | Transaction list using the balance sheet filters. |
| POST | `/api/transactions` | Create a transaction. |
| GET | `/api/transactions/[id]` | Read one transaction. |
| PUT | `/api/transactions/[id]` | Replace the transaction fields. This route uses `PUT`, not `PATCH`. |
| DELETE | `/api/transactions/[id]` | Delete one transaction. |
| GET | `/api/transactions/summary` | Balance totals using the same read module. |
| GET | `/api/transactions/types` | Distinct transaction types. |
| GET | `/api/transactions/types-ranked` | Top 10 ranked types and the remaining types. |
| GET | `/api/transactions/history` | Rows and range totals; requires `startDate` and `endDate`. Optional filters: `tranType`, `tranTypeContains`. |
| GET | `/api/transactions/monthly-totals` | Monthly debit and credit totals by type. |
| GET | `/api/transactions/visualization` | Chart data; requires `startDate` and `endDate`. Optional filter: comma-separated `tranTypes`. |
| GET | `/api/transactions/bulk?ids=1,2` | Read selected rows for separate template review. |
| PUT | `/api/transactions/bulk` | Save a body of `{ transactions: [{ id, ...fields }] }` as one database transaction. |
| DELETE | `/api/transactions/bulk` | Delete a body of `{ ids: [...] }`. |
| DELETE | `/api/transactions/last` | Delete the transaction with the highest ID. |
| GET | `/api/recurring-transactions/templates` | List saved templates. |
| POST | `/api/recurring-transactions/templates` | Create a template. |
| PUT | `/api/recurring-transactions/templates/[id]` | Update template defaults. |
| DELETE | `/api/recurring-transactions/templates/[id]` | Delete a template and preserve existing transactions. |
| POST | `/api/recurring-transactions/check` | Check for existing transactions from the same template in each reviewed month. |
| POST | `/api/recurring-transactions` | Add the reviewed group atomically. Return the count and inserted row IDs. |

## Project structure

```text
src/
├── app/
│   ├── layout.tsx                  # Layout, session, navigation, notifications
│   ├── page.tsx                    # Redirect to the balance sheet
│   ├── login/page.tsx              # Single-user sign-in
│   ├── balance-sheet/page.tsx      # Balance sheet and inline editing
│   ├── add-transaction/page.tsx    # Transaction entry
│   ├── recurring-transactions/page.tsx # Template management and batch review
│   ├── history/page.tsx            # Filtered transaction history
│   ├── monthly-totals/page.tsx     # Monthly totals
│   ├── visualizations/page.tsx     # Bar, line, and pie charts
│   └── api/
│       ├── auth/[...nextauth]/     # Authentication handlers
│       ├── recurring-transactions/ # Templates, duplicate checks, batch creation
│       └── transactions/           # Transaction routes
├── components/                    # Navigation, tables, forms, summary display
│   └── ui/                         # shadcn/ui controls, including alert-dialog
├── hooks/
│   ├── use-balance-sheet.ts        # One-request loading, cancellation, retry
│   ├── use-visualization-data.ts   # Chart loading and request cancellation
│   └── use-mobile.ts               # Mobile layout detection
├── lib/
│   ├── auth.ts                     # Authentication configuration
│   ├── balance-sheet-input.ts     # Shared read filters
│   ├── transaction-input.ts       # Shared write validation and inferred types
│   ├── recurring-input.ts         # Template and batch validation, date rules
│   ├── recurring-draft.ts         # Editable template and transaction defaults
│   ├── added-transactions.ts      # Count, inserted IDs, and return date range
│   ├── db.ts                       # Connection pool and column-name conversion
│   ├── queries.ts                  # Parameterized SQL, bulk saves, balance reads
│   ├── rate-limit.ts              # In-memory login attempt limits
│   ├── api-utils.ts                # Authentication and error helpers
│   ├── types.ts                    # Shared result types
│   ├── format.ts                   # Date and currency formatting
│   └── utils.ts                    # CSS class helpers
└── middleware.ts                  # Session checks for pages and transaction routes

migrations/                        # Additive database schema migrations
scripts/migrate.mjs                # Transactional recurring schema migration
tests/                             # Automated tests, including browser loading tests
└── integration/                   # PostgreSQL balance, bulk save, and recurring tests
```

## Deployment

The app deploys from `main` to Vercel and uses Neon PostgreSQL. Configure the
app environment variables in Vercel. Use a production `DATABASE_URL`, a random
session secret, and your app login credentials. `TEST_DATABASE_URL` is only for
tests. `NEXTAUTH_URL` is not required on Vercel.

Create the base tables before using a new production database. [init.sql](init.sql)
contains the schema and sample inserts. Use the schema definitions without the
sample inserts for production. Add one active carryover row with your starting
balance. Then run `npm run db:migrate` against that database before deploying
this version. The command uses `DATABASE_URL` from the environment or local
Next.js environment files. It adds the recurring transaction tables and link
column without changing existing transaction values. It is safe to run again.
Fresh Compose databases also run this migration during initialization.

Login attempt limits are stored in process memory. They are not shared across
Vercel instances and reset when an instance restarts.

## Recurring transactions

Open **Recurring Transactions** in the navigation. Create a template there, or
select rows on the Balance Sheet and choose **Save as Template** between
**Edit Selected** and **Delete Selected**. Review and save each selected row as
a separate template. History also supports saving individual transactions.
The template list shows notes beside each description. It sorts by day, then
credit before debit, then description.
Templates support income and expenses. They store the description, category,
amount, notes, day of the month, and default posted status.
New templates default to unposted. Leave the amount empty for a variable bill.

Select templates and a month, then select **Add Selected Transactions**.
The month defaults to the current local month. A saved day that does not exist
uses the last day of that month. During review, you can change each field. Changing the group month
resets dates to the saved days. Review changes do not update templates. Amounts
are required during review. Check numbers and multi-part totals start empty.

The app warns when an existing transaction from the same template falls in a
reviewed month. Accept the warning to add another. The app adds the whole group
or none. Failed requests keep your review changes. Retrying the same saved
request does not add the group again. After success, the app opens the Balance
Sheet and shows the number added. New rows have a green highlight and a **New**
label. The message and highlights clear together after 10 seconds. Select
**Dismiss** to clear both sooner. The date range expands when needed to show
older transactions from the group.

Edit templates separately to change future defaults. Template deletion requires
confirmation and preserves existing transactions. There is no automatic schedule.

## Maintainer

[KSerrano88](https://github.com/KSerrano88)
