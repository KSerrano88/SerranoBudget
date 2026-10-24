import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateSchema } from "@/lib/transaction-input";

const testUrl = process.env.TEST_DATABASE_URL;

// Each run uses a separate schema. No application tables are changed.
describe.skipIf(!testUrl)("bulk saves with PostgreSQL", () => {
  const schema = `bulk_save_test_${randomUUID().replaceAll("-", "")}`;
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
    const transactionsSql = readFileSync("init.sql", "utf8")
      .split("CREATE TABLE IF NOT EXISTS balance_carryover")[0];
    await db.query(transactionsSql);
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
      (TRANSACTION_DATE, DESCRIPTION, TRAN_TYPE, DEBIT, CREDIT)
      VALUES ('2024-02-29', 'First original', 'Food', 10, 0),
             ('2024-02-29', 'Second original', 'Food', 20, 0)`);
  });

  function batch(secondId = 2, secondDebit = 22.5) {
    return bulkUpdateSchema.parse({ transactions: [
      { id: 1, TRANSACTION_DATE: "2024-02-29", DESCRIPTION: "First saved", TRAN_TYPE: "Food", DEBIT: 11.5 },
      { id: secondId, TRANSACTION_DATE: "2024-02-29", DESCRIPTION: "Second saved", TRAN_TYPE: "Food", DEBIT: secondDebit },
    ] }).transactions;
  }

  async function storedRows() {
    return (await db.query("SELECT DESCRIPTION, DEBIT FROM transactions ORDER BY ID_TRANSACTIONS")).rows;
  }

  const originals = [
    { DESCRIPTION: "First original", DEBIT: 10 },
    { DESCRIPTION: "Second original", DEBIT: 20 },
  ];

  it("commits every row and reports the saved count", async () => {
    expect(await queries.bulkUpdateTransactions(batch())).toBe(2);
    expect(await storedRows()).toEqual([
      { DESCRIPTION: "First saved", DEBIT: 11.5 },
      { DESCRIPTION: "Second saved", DEBIT: 22.5 },
    ]);
  });

  it("rolls back the earlier write when a later ID is missing", async () => {
    await expect(queries.bulkUpdateTransactions(batch(999)))
      .rejects.toMatchObject({ name: "TransactionNotFoundError", id: 999 });
    expect(await storedRows()).toEqual(originals);
  });

  it("rolls back the earlier write when a later value fails in PostgreSQL", async () => {
    await expect(queries.bulkUpdateTransactions(batch(2, 100000000)))
      .rejects.toMatchObject({ code: "22003" });
    expect(await storedRows()).toEqual(originals);
    // A save must still work after a failed transaction.
    expect(await queries.bulkUpdateTransactions(batch())).toBe(2);
    expect((await storedRows())[0].DESCRIPTION).toBe("First saved");
  });

  it("rejects duplicate IDs without changing stored rows", async () => {
    expect(() => batch(1)).toThrow("Duplicate transaction ID");
    expect(await storedRows()).toEqual(originals);
  });
});
