import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  recurringBatchSchema,
  templateSchema,
  type RecurringTemplate,
} from "@/lib/recurring-input";

const testUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!testUrl)("recurring transactions with PostgreSQL", () => {
  const schema = `recurring_test_${randomUUID().replaceAll("-", "")}`;
  let admin: Pool;
  let db: typeof import("@/lib/db");
  let queries: typeof import("@/lib/queries");
  let template: RecurringTemplate;
  beforeAll(async () => {
    admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const connection = new URL(testUrl!);
    connection.searchParams.set("options", `-c search_path=${schema}`);
    vi.stubEnv("DATABASE_URL", connection.toString());
    db = await import("@/lib/db");
    queries = await import("@/lib/queries");
    await db.query(
      readFileSync("init.sql", "utf8").split(
        "CREATE TABLE IF NOT EXISTS balance_carryover",
      )[0],
    );
    const migration = readFileSync(
      "migrations/001-recurring-transactions.sql",
      "utf8",
    );
    await db.default.query(migration);
    await db.default.query(migration);
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
    await db.query(
      "TRUNCATE transactions, recurring_templates, recurring_batches RESTART IDENTITY CASCADE",
    );
    template = await queries.createRecurringTemplate(
      templateSchema.parse({
        DESCRIPTION: "RENT",
        TRAN_TYPE: "Housing",
        DIRECTION: "debit",
        AMOUNT: 1000,
        DAY_OF_MONTH: 31,
      }),
    );
  });
  function batch(
    amount = 1050,
    date = "2026-02-28",
    requestId: string = randomUUID(),
  ) {
    return recurringBatchSchema.parse({
      requestId,
      transactions: [
        {
          TEMPLATE_ID: template.ID_TEMPLATE,
          DESCRIPTION: "RENT REVIEWED",
          TRAN_TYPE: "Housing",
          DIRECTION: "debit",
          AMOUNT: amount,
          TRANSACTION_DATE: date,
        },
      ],
    });
  }
  async function rows() {
    return (
      await db.query("SELECT * FROM transactions ORDER BY ID_TRANSACTIONS")
    ).rows;
  }

  it("adds a group with separate review values and preserves the template", async () => {
    const input = batch();
    input.transactions.push({
      ...input.transactions[0],
      DIRECTION: "credit",
      TRANSACTION_DATE: "2026-03-01",
      AMOUNT: 2000,
      POSTED_FLAG: 1,
    });
    expect(await queries.createRecurringTransactions(input)).toBe(2);
    expect(await rows()).toMatchObject([
      {
        DESCRIPTION: "RENT REVIEWED",
        DEBIT: 1050,
        CREDIT: 0,
        POSTED_FLAG: 0,
        CHECK_NMBR: "",
        MULTI_PART_TRAN_TOTAL: 0,
      },
      { DEBIT: 0, CREDIT: 2000, POSTED_FLAG: 1 },
    ]);
    expect((await queries.getRecurringTemplates())[0]).toEqual(template);
  });
  it("warns by template and reviewed month, then permits an explicit repeat", async () => {
    await queries.createRecurringTransactions(batch());
    const second = batch(1060, "2026-02-01");
    await expect(
      queries.createRecurringTransactions(second),
    ).rejects.toMatchObject({
      duplicates: [{ templateId: 1, month: "2026-02" }],
    });
    expect(await rows()).toHaveLength(1);
    expect(
      await queries.createRecurringTransactions({
        ...second,
        allowDuplicates: true,
      }),
    ).toBe(1);
    expect(
      await queries.createRecurringTransactions(batch(1060, "2026-03-01")),
    ).toBe(1);
    expect(await rows()).toHaveLength(3);
  });
  it("serializes concurrent groups so one gets a duplicate warning", async () => {
    const results = await Promise.allSettled([
      queries.createRecurringTransactions(batch()),
      queries.createRecurringTransactions(batch()),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await rows()).toHaveLength(1);
  });
  it("returns a saved group's count on retry and rejects changed values for the same request", async () => {
    const input = batch();
    expect(await queries.createRecurringTransactions(input)).toBe(1);
    expect(await queries.createRecurringTransactions(input)).toBe(1);
    const changed = batch(1200, "2026-02-28", input.requestId);
    await expect(
      queries.createRecurringTransactions(changed),
    ).rejects.toBeInstanceOf(queries.RecurringRequestConflictError);
    expect(await rows()).toHaveLength(1);
  });
  it("rolls back the whole group and request record when an insert fails", async () => {
    const input = batch();
    input.transactions.push({ ...input.transactions[0], AMOUNT: 100000000 });
    await expect(
      queries.createRecurringTransactions(input),
    ).rejects.toMatchObject({ code: "22003" });
    expect(await rows()).toHaveLength(0);
    expect(
      (await db.query("SELECT * FROM recurring_batches")).rows,
    ).toHaveLength(0);
    input.transactions.pop();
    expect(await queries.createRecurringTransactions(input)).toBe(1);
  });
  it("rejects a deleted template without saving other rows", async () => {
    const input = batch();
    input.transactions.push({ ...input.transactions[0], TEMPLATE_ID: 999 });
    await expect(
      queries.createRecurringTransactions(input),
    ).rejects.toBeInstanceOf(queries.RecurringTemplateMissingError);
    expect(await rows()).toHaveLength(0);
  });
  it("keeps transactions when a template is deleted", async () => {
    await queries.createRecurringTransactions(batch());
    expect(await queries.deleteRecurringTemplate(template.ID_TEMPLATE)).toBe(
      true,
    );
    expect(await rows()).toMatchObject([
      {
        DESCRIPTION: "RENT REVIEWED",
        DEBIT: 1050,
        RECURRING_TEMPLATE_ID: null,
      },
    ]);
    expect(await queries.getRecurringTemplates()).toHaveLength(0);
  });
  it("updates template defaults without changing existing transactions", async () => {
    await queries.createRecurringTransactions(batch());
    await queries.updateRecurringTemplate(template.ID_TEMPLATE, {
      ...template,
      AMOUNT: null,
      POSTED_FLAG: 1,
    });
    expect((await queries.getRecurringTemplates())[0]).toMatchObject({
      AMOUNT: null,
      POSTED_FLAG: 1,
    });
    expect(await rows()).toMatchObject([{ DEBIT: 1050, POSTED_FLAG: 0 }]);
  });
});
