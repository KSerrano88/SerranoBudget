import pool, { query } from "./db";
import type { BalanceSheetFilters } from "./balance-sheet-input";
import type { BalanceSheetData, Transaction } from "./types";
import type { BulkTransaction, ValidatedTransaction } from "./transaction-input";
import type { PoolClient } from "pg";
import type { TemplateInput, RecurringTemplate, RecurringBatch, RecurringCheck, RecurringDuplicate } from "./recurring-input";

// ===== BALANCE SHEET QUERIES =====

export async function getBalanceSheet({ days, postStatus }: BalanceSheetFilters) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // One statement keeps the rows, range totals, and overall balances in one snapshot.
  const sql = `WITH filtered AS (
    SELECT * FROM transactions
    WHERE ($2 = 'unposted' AND POSTED_FLAG = 0)
       OR ($2 <> 'unposted' AND TRANSACTION_DATE >= $1::date
           AND ($2 = 'all' OR POSTED_FLAG = 1))
  ), range_totals AS (
    SELECT ROUND(SUM(DEBIT), 2) AS debit, ROUND(SUM(CREDIT), 2) AS credit
    FROM filtered
  ), totals AS (
    SELECT ROUND(SUM(DEBIT), 2) AS debit, ROUND(SUM(CREDIT), 2) AS credit,
           ROUND(SUM(DEBIT) FILTER (WHERE POSTED_FLAG = 1), 2) AS posted_debit,
           ROUND(SUM(CREDIT) FILTER (WHERE POSTED_FLAG = 1), 2) AS posted_credit
    FROM transactions
  ), carryover AS (
    SELECT ROUND(SUM(AMOUNT), 2) AS carryover_amount,
           (SELECT AMOUNT FROM balance_carryover WHERE IS_ACTIVE = 1) AS amount
    FROM balance_carryover WHERE IS_ACTIVE = 1
  )
  SELECT jsonb_build_object(
    'transactions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ID_TRANSACTIONS', ID_TRANSACTIONS,
        'TRANSACTION_DATE', TO_CHAR(TRANSACTION_DATE, 'YYYY-MM-DD'),
        'CHECK_NMBR', CHECK_NMBR,
        'DESCRIPTION', DESCRIPTION,
        'NOTES', NOTES,
        'MULTI_PART_TRAN_TOTAL', MULTI_PART_TRAN_TOTAL,
        'POSTED_FLAG', POSTED_FLAG,
        'TRAN_TYPE', TRAN_TYPE,
        'DEBIT', DEBIT,
        'CREDIT', CREDIT
      ) ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC)
      FROM filtered
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'rangeSummary', jsonb_build_object(
        'SUM_DEBIT', r.debit, 'SUM_CREDIT', r.credit, 'DIFFERENCE', r.credit - r.debit
      ),
      'totalBalance', jsonb_build_object(
        'SUM_DEBIT', t.debit, 'SUM_CREDIT', t.credit, 'DIFFERENCE', t.credit - t.debit,
        'TOTAL_BAL', t.credit - t.debit + c.amount
      ),
      'postedBalance', jsonb_build_object(
        'POSTED_DEBIT', t.posted_debit, 'POSTED_CREDIT', t.posted_credit,
        'TOTAL_POSTED_BAL', t.posted_credit - t.posted_debit + c.amount
      ),
      'carryOver', jsonb_build_object('CARRYOVER_AMOUNT', c.carryover_amount)
    )
  ) AS data
  FROM range_totals r CROSS JOIN totals t CROSS JOIN carryover c`;
  const { rows } = await query<{ DATA: BalanceSheetData }>(sql, [
    startDate.toISOString().split("T")[0],
    postStatus,
  ]);
  return rows[0].DATA;
}

// ===== TRANSACTION CRUD =====

export async function createTransaction(t: ValidatedTransaction) {
  const sql = `INSERT INTO transactions
    (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES,
     MULTI_PART_TRAN_TOTAL, POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING ID_TRANSACTIONS`;
  const { rows } = await query(sql, [
    t.TRANSACTION_DATE,
    t.CHECK_NMBR,
    t.DESCRIPTION,
    t.NOTES,
    t.MULTI_PART_TRAN_TOTAL,
    t.POSTED_FLAG,
    t.TRAN_TYPE,
    t.DEBIT,
    t.CREDIT,
  ]);
  return rows[0].ID_TRANSACTIONS;
}

const updateTransactionSql = `UPDATE transactions SET
  TRANSACTION_DATE = $1, CHECK_NMBR = $2, DESCRIPTION = $3,
  NOTES = $4, MULTI_PART_TRAN_TOTAL = $5, POSTED_FLAG = $6,
  TRAN_TYPE = $7, DEBIT = $8, CREDIT = $9
  WHERE ID_TRANSACTIONS = $10`;

function updateTransactionParams(id: number, t: ValidatedTransaction) {
  return [
    t.TRANSACTION_DATE,
    t.CHECK_NMBR,
    t.DESCRIPTION,
    t.NOTES,
    t.MULTI_PART_TRAN_TOTAL,
    t.POSTED_FLAG,
    t.TRAN_TYPE,
    t.DEBIT,
    t.CREDIT,
    id,
  ];
}

export async function updateTransaction(id: number, t: ValidatedTransaction) {
  await query(updateTransactionSql, updateTransactionParams(id, t));
}

export class TransactionNotFoundError extends Error {
  constructor(readonly id: number) {
    super(`Transaction ${id} was not found`);
    this.name = "TransactionNotFoundError";
  }
}

export async function bulkUpdateTransactions(transactions: BulkTransaction[]) {
  const client = await pool.connect();
  let discardClient = false;
  try {
    await client.query("BEGIN");
    // A stable row order reduces deadlocks between overlapping saves.
    for (const transaction of [...transactions].sort((a, b) => a.id - b.id)) {
      const result = await client.query(
        updateTransactionSql,
        updateTransactionParams(transaction.id, transaction)
      );
      if (result.rowCount !== 1) {
        throw new TransactionNotFoundError(transaction.id);
      }
    }
    await client.query("COMMIT");
    return transactions.length;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Discard a connection whose transaction state is unknown.
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

export async function deleteTransactions(ids: number[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `DELETE FROM transactions WHERE ID_TRANSACTIONS IN (${placeholders})`;
  await query(sql, ids);
}

export async function getLastTransaction(): Promise<Transaction | null> {
  const { rows } = await query(
    "SELECT * FROM transactions ORDER BY ID_TRANSACTIONS DESC LIMIT 1"
  );
  return (rows[0] ?? null) as Transaction | null;
}

export async function deleteLastTransaction(id: number) {
  const { rows } = await query(
    "DELETE FROM transactions WHERE ID_TRANSACTIONS = $1 RETURNING ID_TRANSACTIONS",
    [id]
  );
  return rows[0]?.ID_TRANSACTIONS ?? null;
}

export async function getTransactionsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `SELECT * FROM transactions WHERE ID_TRANSACTIONS IN (${placeholders})`;
  const { rows } = await query(sql, ids);
  return rows;
}

// ===== TRANSACTION TYPES =====

export async function getTransactionTypes() {
  const sql = `SELECT DISTINCT TRAN_TYPE FROM transactions ORDER BY TRAN_TYPE`;
  const { rows } = await query(sql);
  return rows.map((r: Record<string, unknown>) => r.TRAN_TYPE as string).filter(Boolean);
}

export async function getTransactionTypesRanked(topN = 10) {
  const sql = `SELECT TRAN_TYPE,
                      ROUND(
                        (POWER(COUNT(DISTINCT DATE_TRUNC('month', TRANSACTION_DATE)), 2)
                        * SUM(DEBIT + CREDIT)
                        * LN(COUNT(*) + 1))::numeric
                      ) AS SCORE
               FROM transactions
               WHERE TRAN_TYPE IS NOT NULL AND TRAN_TYPE <> ''
                 AND TRANSACTION_DATE >= NOW() - INTERVAL '12 months'
               GROUP BY TRAN_TYPE
               ORDER BY SCORE DESC`;
  const { rows } = await query(sql);
  const all = rows as Array<{ TRAN_TYPE: string; SCORE: string }>;
  const top = all.slice(0, topN).map((r) => r.TRAN_TYPE);
  const rest = all.slice(topN).map((r) => r.TRAN_TYPE).sort();
  return { top, rest };
}

// ===== TRANSACTION HISTORY =====

export async function getTransactionHistory(params: {
  startDate: string;
  endDate: string;
  tranType?: string;
  tranTypeContains?: string;
}) {
  let whereTranType = "";
  const queryParams: (string | number)[] = [params.startDate, params.endDate];
  let paramIndex = 3;

  if (params.tranType && !params.tranTypeContains) {
    whereTranType = `AND TRAN_TYPE = $${paramIndex}`;
    queryParams.push(params.tranType);
    paramIndex++;
  } else if (!params.tranType && params.tranTypeContains) {
    whereTranType = `AND TRAN_TYPE LIKE $${paramIndex}`;
    queryParams.push(`%${params.tranTypeContains}%`);
    paramIndex++;
  } else if (params.tranType && params.tranTypeContains) {
    whereTranType = `AND (TRAN_TYPE = $${paramIndex} AND TRAN_TYPE LIKE $${paramIndex + 1})`;
    queryParams.push(params.tranType, `%${params.tranTypeContains}%`);
    paramIndex += 2;
  }

  const sqlDetail = `SELECT * FROM transactions
    WHERE TRANSACTION_DATE >= $1 AND TRANSACTION_DATE <= $2
    ${whereTranType}
    ORDER BY TRANSACTION_DATE, ID_TRANSACTIONS`;

  const sqlSum = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS SUM_DEBIT,
                         ROUND(SUM(CREDIT)::numeric,2) AS SUM_CREDIT,
                         (ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2)) AS DIFFERENCE
                  FROM transactions
                  WHERE TRANSACTION_DATE >= $1 AND TRANSACTION_DATE <= $2
                  ${whereTranType}`;

  const detailResult = await query(sqlDetail, queryParams);
  const sumResult = await query(sqlSum, queryParams);

  return { transactions: detailResult.rows, summary: sumResult.rows[0] };
}

// ===== MONTHLY TOTALS =====

export async function getMonthlyTotals() {
  const results: Array<{
    month: number;
    year: number;
    monthName: string;
    debits: Array<{ TRAN_TYPE: string; SUM_DEBIT: number }>;
    credits: Array<{ TRAN_TYPE: string; SUM_CREDIT: number }>;
  }> = [];

  const now = new Date();
  let curMonth = now.getMonth() + 1;
  let curYear = now.getFullYear();
  const priorYear = curYear - 1;

  // Loop from current month backwards through prior year
  while (curYear >= priorYear) {
    const monthName = new Date(curYear, curMonth - 1, 1).toLocaleString(
      "en-US",
      { month: "long" }
    );

    const sqlDebit = `SELECT COALESCE(TRAN_TYPE,'TOTAL DEBITS') AS TRAN_TYPE,
                             SUM(DEBIT) AS SUM_DEBIT
                      FROM transactions
                      WHERE EXTRACT(MONTH FROM TRANSACTION_DATE) = $1
                        AND EXTRACT(YEAR FROM TRANSACTION_DATE) = $2
                        AND DEBIT <> 0
                      GROUP BY ROLLUP(TRAN_TYPE)`;

    const sqlCredit = `SELECT COALESCE(TRAN_TYPE,'TOTAL CREDITS') AS TRAN_TYPE,
                              SUM(CREDIT) AS SUM_CREDIT
                       FROM transactions
                       WHERE EXTRACT(MONTH FROM TRANSACTION_DATE) = $1
                         AND EXTRACT(YEAR FROM TRANSACTION_DATE) = $2
                         AND CREDIT <> 0
                       GROUP BY ROLLUP(TRAN_TYPE)`;

    const debitResult = await query(sqlDebit, [curMonth, curYear]);
    const creditResult = await query(sqlCredit, [curMonth, curYear]);

    if (debitResult.rows.length > 0 || creditResult.rows.length > 0) {
      results.push({
        month: curMonth,
        year: curYear,
        monthName,
        debits: debitResult.rows as unknown as Array<{ TRAN_TYPE: string; SUM_DEBIT: number }>,
        credits: creditResult.rows as unknown as Array<{ TRAN_TYPE: string; SUM_CREDIT: number }>,
      });
    }

    curMonth--;
    if (curMonth === 0) {
      curMonth = 12;
      curYear--;
    }

    // Stop after going through prior year's January
    if (curYear < priorYear) break;
  }

  return results;
}

// ===== VISUALIZATION QUERIES =====

export async function getVisualizationData(params: {
  startDate: string;
  endDate: string;
  tranTypes: string[];
}) {
  const queryParams: (string | number)[] = [params.startDate, params.endDate];
  let typeFilter = "";

  if (params.tranTypes.length > 0) {
    const placeholders = params.tranTypes
      .map((_, i) => `$${i + 3}`)
      .join(",");
    typeFilter = `AND TRAN_TYPE IN (${placeholders})`;
    queryParams.push(...params.tranTypes);
  }

  const sql = `SELECT
    TRAN_TYPE,
    TO_CHAR(DATE_TRUNC('month', TRANSACTION_DATE), 'YYYY-MM') AS MONTH,
    ROUND(SUM(DEBIT)::numeric, 2) AS TOTAL_DEBIT,
    ROUND(SUM(CREDIT)::numeric, 2) AS TOTAL_CREDIT
  FROM transactions
  WHERE TRANSACTION_DATE >= $1 AND TRANSACTION_DATE <= $2
    ${typeFilter}
  GROUP BY TRAN_TYPE, DATE_TRUNC('month', TRANSACTION_DATE)
  ORDER BY MONTH, TRAN_TYPE`;

  const { rows } = await query(sql, queryParams);
  return rows as Array<{
    TRAN_TYPE: string;
    MONTH: string;
    TOTAL_DEBIT: number;
    TOTAL_CREDIT: number;
  }>;
}

// ===== RECURRING TRANSACTIONS =====

export async function getRecurringTemplates() {
  const { rows } = await query<RecurringTemplate>(
    "SELECT * FROM recurring_templates ORDER BY DAY_OF_MONTH, DIRECTION, DESCRIPTION, ID_TEMPLATE"
  );
  return rows;
}

function templateParams(t: TemplateInput) {
  return [t.DESCRIPTION, t.TRAN_TYPE, t.DIRECTION, t.AMOUNT, t.NOTES, t.DAY_OF_MONTH, t.POSTED_FLAG];
}

export async function createRecurringTemplate(t: TemplateInput) {
  const { rows } = await query<RecurringTemplate>(`INSERT INTO recurring_templates
    (DESCRIPTION, TRAN_TYPE, DIRECTION, AMOUNT, NOTES, DAY_OF_MONTH, POSTED_FLAG)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, templateParams(t));
  return rows[0];
}

export async function updateRecurringTemplate(id: number, t: TemplateInput): Promise<RecurringTemplate | null> {
  const { rows } = await query<RecurringTemplate>(`UPDATE recurring_templates SET
    DESCRIPTION = $1, TRAN_TYPE = $2, DIRECTION = $3, AMOUNT = $4,
    NOTES = $5, DAY_OF_MONTH = $6, POSTED_FLAG = $7
    WHERE ID_TEMPLATE = $8 RETURNING *`, [...templateParams(t), id]);
  return rows[0] ?? null;
}

export async function deleteRecurringTemplate(id: number) {
  const result = await query("DELETE FROM recurring_templates WHERE ID_TEMPLATE = $1", [id]);
  return result.rowCount === 1;
}

export async function getRecurringDuplicates(transactions: RecurringCheck, client: PoolClient | typeof pool = pool): Promise<RecurringDuplicate[]> {
  const { rows } = await client.query(`SELECT DISTINCT
      t.RECURRING_TEMPLATE_ID AS template_id,
      TO_CHAR(t.TRANSACTION_DATE, 'YYYY-MM') AS month
    FROM transactions t
    JOIN jsonb_to_recordset($1::jsonb) AS r(template_id integer, date date)
      ON t.RECURRING_TEMPLATE_ID = r.template_id
      AND t.TRANSACTION_DATE >= DATE_TRUNC('month', r.date)
      AND t.TRANSACTION_DATE < DATE_TRUNC('month', r.date) + INTERVAL '1 month'
    ORDER BY template_id, month`, [JSON.stringify(transactions.map(t => ({
      template_id: t.TEMPLATE_ID, date: t.TRANSACTION_DATE,
    })))]);
  return rows.map(row => ({ templateId: row.template_id, month: row.month }));
}

export class RecurringDuplicateError extends Error {
  constructor(readonly duplicates: RecurringDuplicate[]) {
    super("Review the duplicate warning before adding this group.");
  }
}

export class RecurringTemplateMissingError extends Error {
  constructor() { super("A selected template was deleted. Return to the template list and select it again."); }
}

export class RecurringRequestConflictError extends Error {
  constructor() { super("This request was already saved with different values. Start a new group."); }
}

export async function createRecurringTransactions(batch: RecurringBatch) {
  const client = await pool.connect();
  let discardClient = false;
  const payload = JSON.stringify(batch.transactions);
  try {
    await client.query("BEGIN");
    const inserted = await client.query(`INSERT INTO recurring_batches
      (REQUEST_ID, PAYLOAD, TRANSACTION_COUNT) VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (REQUEST_ID) DO NOTHING RETURNING TRANSACTION_COUNT`,
    [batch.requestId, payload, batch.transactions.length]);
    if (!inserted.rowCount) {
      const { rows } = await client.query(`SELECT TRANSACTION_COUNT, COALESCE(PAYLOAD->'transactions', PAYLOAD) = $2::jsonb AS matches,
        COALESCE(PAYLOAD->'ids', '[]'::jsonb) AS ids
        FROM recurring_batches WHERE REQUEST_ID = $1`, [batch.requestId, payload]);
      if (!rows[0]?.matches) throw new RecurringRequestConflictError();
      await client.query("COMMIT");
      return { count: rows[0].transaction_count as number, ids: rows[0].ids as number[] };
    }

    // Serialize groups that use the same templates before checking for duplicates.
    const ids = [...new Set(batch.transactions.map(t => t.TEMPLATE_ID))].sort((a, b) => a - b);
    const locked = await client.query(`SELECT ID_TEMPLATE FROM recurring_templates
      WHERE ID_TEMPLATE = ANY($1::integer[]) ORDER BY ID_TEMPLATE FOR UPDATE`, [ids]);
    if (locked.rowCount !== ids.length) throw new RecurringTemplateMissingError();
    const duplicates = await getRecurringDuplicates(batch.transactions, client);
    if (duplicates.length && !batch.allowDuplicates) throw new RecurringDuplicateError(duplicates);

    const created = await client.query<{ id_transactions: number }>(`INSERT INTO transactions
      (TRANSACTION_DATE, CHECK_NMBR, DESCRIPTION, NOTES, MULTI_PART_TRAN_TOTAL,
       POSTED_FLAG, TRAN_TYPE, DEBIT, CREDIT, RECURRING_TEMPLATE_ID)
      SELECT "TRANSACTION_DATE", "CHECK_NMBR", "DESCRIPTION", "NOTES", "MULTI_PART_TRAN_TOTAL",
        "POSTED_FLAG", "TRAN_TYPE",
        CASE WHEN "DIRECTION" = 'debit' THEN "AMOUNT" ELSE 0 END,
        CASE WHEN "DIRECTION" = 'credit' THEN "AMOUNT" ELSE 0 END, "TEMPLATE_ID"
      FROM jsonb_to_recordset($1::jsonb) AS r(
        "TRANSACTION_DATE" date, "CHECK_NMBR" text, "DESCRIPTION" text, "NOTES" text,
        "MULTI_PART_TRAN_TOTAL" numeric, "POSTED_FLAG" smallint, "TRAN_TYPE" text,
        "DIRECTION" text, "AMOUNT" numeric, "TEMPLATE_ID" integer)
      RETURNING ID_TRANSACTIONS`, [payload]);
    const transactionIds = created.rows.map(row => row.id_transactions);
    // A retry must return the same rows for the Balance Sheet highlight.
    await client.query(`UPDATE recurring_batches
      SET PAYLOAD = jsonb_build_object('transactions', $2::jsonb, 'ids', $3::jsonb)
      WHERE REQUEST_ID = $1`, [batch.requestId, payload, JSON.stringify(transactionIds)]);
    await client.query("COMMIT");
    return { count: batch.transactions.length, ids: transactionIds };
  } catch (error) {
    try { await client.query("ROLLBACK"); }
    catch { discardClient = true; }
    throw error;
  } finally {
    client.release(discardClient);
  }
}
