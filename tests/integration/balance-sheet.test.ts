import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testUrl)("balance sheet reads with PostgreSQL", () => {
  const schema = `balance_test_${randomUUID().replaceAll("-", "")}`;
  let admin: Pool;
  let db: typeof import("@/lib/db");
  let queries: typeof import("@/lib/queries");

  beforeAll(async () => {
    admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const connection = new URL(testUrl!);
    connection.searchParams.set("options", `-c search_path=${schema}`);
    connection.searchParams.set("application_name", schema);
    vi.stubEnv("DATABASE_URL", connection.toString());
    db = await import("@/lib/db");
    queries = await import("@/lib/queries");
    const schemaSql = readFileSync("init.sql", "utf8").split("-- Carryover balance")[0];
    await db.default.query(schemaSql);
  });

  afterAll(async () => {
    await db?.default.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await db.query("TRUNCATE transactions, balance_carryover RESTART IDENTITY");
    await db.query(`INSERT INTO balance_carryover (AMOUNT, IS_ACTIVE) VALUES (100, 1), (900, 0)`);
    await db.query(`INSERT INTO transactions
      (TRANSACTION_DATE, DESCRIPTION, TRAN_TYPE, POSTED_FLAG, DEBIT, CREDIT)
      VALUES (CURRENT_DATE - 100, 'Old posted', 'Food', 1, 10, 100),
             (CURRENT_DATE - 100, 'Old unposted', 'Food', 0, 20, 0),
             (CURRENT_DATE, 'Recent posted', 'Food', 1, 3.25, 50.50),
             (CURRENT_DATE, 'Recent unposted', 'Food', 0, 4.10, 0),
             (CURRENT_DATE + 1, 'Future posted', 'Food', 1, 5, 0)`);
  });

  it.each([
    { postStatus: "all" as const, ids: [5, 4, 3], debit: 12.35, credit: 50.5 },
    { postStatus: "posted" as const, ids: [5, 3], debit: 8.25, credit: 50.5 },
    { postStatus: "unposted" as const, ids: [4, 2], debit: 24.1, credit: 0 },
  ])("keeps $postStatus rows and range totals consistent", async ({ postStatus, ids, debit, credit }) => {
    const result = await queries.getBalanceSheet({ days: 30, postStatus });
    expect(result.transactions.map((t) => t.ID_TRANSACTIONS)).toEqual(ids);
    expect(result.summary.rangeSummary).toEqual({
      SUM_DEBIT: debit, SUM_CREDIT: credit, DIFFERENCE: Number((credit - debit).toFixed(2)),
    });
    expect(result.transactions[0].TRANSACTION_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.summary.totalBalance).toEqual({
      SUM_DEBIT: 42.35, SUM_CREDIT: 150.5, DIFFERENCE: 108.15, TOTAL_BAL: 208.15,
    });
    expect(result.summary.postedBalance).toEqual({
      POSTED_DEBIT: 18.25, POSTED_CREDIT: 150.5, TOTAL_POSTED_BAL: 232.25,
    });
    expect(result.summary.carryOver).toEqual({ CARRYOVER_AMOUNT: 100 });
  });

  it("includes the lower date limit and keeps future rows", async () => {
    const result = await queries.getBalanceSheet({ days: 0, postStatus: "all" });
    expect(result.transactions.map((t) => t.ID_TRANSACTIONS)).toEqual([5, 4, 3]);
  });

  it("includes older rows when the date range expands", async () => {
    const result = await queries.getBalanceSheet({ days: 3650, postStatus: "all" });
    expect(result.transactions.map((t) => t.ID_TRANSACTIONS)).toEqual([5, 4, 3, 2, 1]);
    expect(result.summary.rangeSummary.DIFFERENCE).toBe(108.15);
  });

  it("keeps overall balances when no rows match the filter", async () => {
    await db.query("UPDATE transactions SET TRANSACTION_DATE = CURRENT_DATE - 100");
    const result = await queries.getBalanceSheet({ days: 0, postStatus: "posted" });
    expect(result.transactions).toEqual([]);
    expect(result.summary.rangeSummary).toEqual({ SUM_DEBIT: null, SUM_CREDIT: null, DIFFERENCE: null });
    expect(result.summary.totalBalance.TOTAL_BAL).toBe(208.15);
  });

  it("preserves null aggregates for an empty ledger", async () => {
    await db.query("TRUNCATE transactions");
    const result = await queries.getBalanceSheet({ days: 30, postStatus: "all" });
    expect(result.transactions).toEqual([]);
    expect(result.summary.rangeSummary).toEqual({ SUM_DEBIT: null, SUM_CREDIT: null, DIFFERENCE: null });
    expect(result.summary.totalBalance.TOTAL_BAL).toBeNull();
    expect(result.summary.postedBalance.TOTAL_POSTED_BAL).toBeNull();
  });

  it("preserves null balances when no carryover is active", async () => {
    await db.query("UPDATE balance_carryover SET IS_ACTIVE = 0");
    const result = await queries.getBalanceSheet({ days: 30, postStatus: "all" });
    expect(result.summary.totalBalance.TOTAL_BAL).toBeNull();
    expect(result.summary.postedBalance.TOTAL_POSTED_BAL).toBeNull();
    expect(result.summary.carryOver.CARRYOVER_AMOUNT).toBeNull();
  });

  it("keeps one snapshot while another connection commits a new row", async () => {
    const lockKey = parseInt(randomUUID().slice(0, 7), 16);
    const blocker = await admin.connect();
    let pending: ReturnType<typeof queries.getBalanceSheet> | undefined;
    await db.query("ALTER TABLE transactions RENAME TO snapshot_transactions");
    await db.query(`CREATE FUNCTION wait_for_read() RETURNS boolean LANGUAGE plpgsql VOLATILE AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(${lockKey});
        RETURN true;
      END;
    $$`);
    await db.query("CREATE VIEW transactions AS SELECT * FROM snapshot_transactions WHERE wait_for_read()");
    try {
      await blocker.query("SELECT pg_advisory_lock($1)", [lockKey]);
      pending = queries.getBalanceSheet({ days: 30, postStatus: "all" });
      // Wait until the read has its snapshot and is blocked inside the view.
      await expect.poll(async () => {
        const { rows } = await admin.query(
          "SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND wait_event = 'advisory'",
          [schema]
        );
        return rows.length > 0;
      }, { timeout: 5000 }).toBe(true);
      await admin.query(`INSERT INTO ${schema}.snapshot_transactions
        (TRANSACTION_DATE, DESCRIPTION, POSTED_FLAG, DEBIT, CREDIT)
        VALUES (CURRENT_DATE, 'Concurrent write', 1, 0, 1000)`);
      await blocker.query("SELECT pg_advisory_unlock($1)", [lockKey]);
      const result = await pending;
      expect(result.transactions.map((t) => t.ID_TRANSACTIONS)).toEqual([5, 4, 3]);
      expect(result.summary.rangeSummary.SUM_CREDIT).toBe(50.5);
      expect(result.summary.totalBalance.TOTAL_BAL).toBe(208.15);
      expect(result.summary.postedBalance.TOTAL_POSTED_BAL).toBe(232.25);
    } finally {
      await blocker.query("SELECT pg_advisory_unlock($1)", [lockKey]);
      blocker.release();
      await pending?.catch(() => {});
      await db.query("DROP VIEW transactions");
      await db.query("DROP FUNCTION wait_for_read()");
      await db.query("ALTER TABLE snapshot_transactions RENAME TO transactions");
    }
  });
});
