import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testUrl)("last transaction with PostgreSQL", () => {
  const schema = `last_transaction_test_${randomUUID().replaceAll("-", "")}`;
  let admin: Pool;
  let db: typeof import("@/lib/db");
  let queries: typeof import("@/lib/queries");

  beforeAll(async () => {
    admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const connection = new URL(testUrl!);
    connection.searchParams.set("options", `-c search_path=${schema}`);
    vi.stubEnv("DATABASE_URL", connection.toString());
    db = await import("@/lib/db");
    queries = await import("@/lib/queries");
    await db.query(readFileSync("init.sql", "utf8").split("CREATE TABLE IF NOT EXISTS balance_carryover")[0]);
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
    await db.query("TRUNCATE transactions RESTART IDENTITY");
    await db.query(`INSERT INTO transactions
      (TRANSACTION_DATE, DESCRIPTION, TRAN_TYPE, DEBIT, CREDIT, POSTED_FLAG)
      VALUES ('2026-10-24', 'Earlier addition', 'Food', 10, 0, 0),
             ('2026-01-01', 'Last addition', 'Income', 0, 20, 1)`);
  });

  it("selects the highest ID regardless of date or posted status", async () => {
    expect(await queries.getLastTransaction()).toMatchObject({
      ID_TRANSACTIONS: 2, DESCRIPTION: "Last addition", POSTED_FLAG: 1, CREDIT: 20,
    });
  });
  it("deletes the previewed row even when a newer entry is added", async () => {
    const selected = await queries.getLastTransaction();
    await db.query(`INSERT INTO transactions
      (TRANSACTION_DATE, DESCRIPTION, TRAN_TYPE) VALUES ('2026-10-24', 'New addition', 'Food')`);
    expect(await queries.deleteLastTransaction(selected!.ID_TRANSACTIONS)).toBe(2);
    expect((await db.query("SELECT ID_TRANSACTIONS FROM transactions ORDER BY ID_TRANSACTIONS")).rows)
      .toEqual([{ ID_TRANSACTIONS: 1 }, { ID_TRANSACTIONS: 3 }]);
    expect(await queries.deleteLastTransaction(selected!.ID_TRANSACTIONS)).toBeNull();
    expect((await queries.getLastTransaction())?.ID_TRANSACTIONS).toBe(3);
  });
  it("returns an explicit empty preview", async () => {
    await db.query("TRUNCATE transactions");
    expect(await queries.getLastTransaction()).toBeNull();
  });
});
