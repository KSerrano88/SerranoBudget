import { query } from "./db";

// ===== BALANCE SHEET QUERIES =====

export async function getBalanceSheetTransactions(
  numDaysPrior: number,
  postStatus: "all" | "posted" | "unposted"
) {
  const tranDate = new Date();
  tranDate.setDate(tranDate.getDate() - numDaysPrior);
  const tranDateStr = tranDate.toISOString().split("T")[0];

  let sql: string;
  let params: (string | number)[];

  if (postStatus === "unposted") {
    sql = `SELECT * FROM transactions
           WHERE POSTED_FLAG = 0
           ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC`;
    params = [];
  } else if (postStatus === "posted") {
    sql = `SELECT * FROM transactions
           WHERE TRANSACTION_DATE >= $1
           AND POSTED_FLAG = 1
           ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC`;
    params = [tranDateStr];
  } else {
    sql = `SELECT * FROM transactions
           WHERE TRANSACTION_DATE >= $1
           ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC`;
    params = [tranDateStr];
  }

  const { rows } = await query(sql, params);
  return rows;
}

export async function getDateRangeSummary(
  numDaysPrior: number,
  postStatus: "all" | "posted" | "unposted"
) {
  const tranDate = new Date();
  tranDate.setDate(tranDate.getDate() - numDaysPrior);
  const tranDateStr = tranDate.toISOString().split("T")[0];

  let sql: string;
  let params: (string | number)[];

  if (postStatus === "unposted") {
    sql = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS SUM_DEBIT,
                  ROUND(SUM(CREDIT)::numeric,2) AS SUM_CREDIT,
                  (ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2)) AS DIFFERENCE
           FROM transactions WHERE POSTED_FLAG = 0`;
    params = [];
  } else if (postStatus === "posted") {
    sql = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS SUM_DEBIT,
                  ROUND(SUM(CREDIT)::numeric,2) AS SUM_CREDIT,
                  (ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2)) AS DIFFERENCE
           FROM transactions WHERE POSTED_FLAG = 1 AND TRANSACTION_DATE >= $1`;
    params = [tranDateStr];
  } else {
    sql = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS SUM_DEBIT,
                  ROUND(SUM(CREDIT)::numeric,2) AS SUM_CREDIT,
                  (ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2)) AS DIFFERENCE
           FROM transactions WHERE TRANSACTION_DATE >= $1`;
    params = [tranDateStr];
  }

  const { rows } = await query(sql, params);
  return rows[0];
}

export async function getTotalBalance() {
  const sql = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS SUM_DEBIT,
                      ROUND(SUM(CREDIT)::numeric,2) AS SUM_CREDIT,
                      (ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2)) AS DIFFERENCE,
                      ((ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2))
                        + (SELECT AMOUNT FROM balance_carryover WHERE IS_ACTIVE = 1)) AS TOTAL_BAL
               FROM transactions`;
  const { rows } = await query(sql);
  return rows[0];
}

export async function getPostedBalance() {
  const sql = `SELECT ROUND(SUM(DEBIT)::numeric,2) AS POSTED_DEBIT,
                      ROUND(SUM(CREDIT)::numeric,2) AS POSTED_CREDIT,
                      ((ROUND(SUM(CREDIT)::numeric,2) - ROUND(SUM(DEBIT)::numeric,2))
                        + (SELECT AMOUNT FROM balance_carryover WHERE IS_ACTIVE = 1)) AS TOTAL_POSTED_BAL
               FROM transactions WHERE POSTED_FLAG = 1`;
  const { rows } = await query(sql);
  return rows[0];
}

export async function getCarryOver() {
  const sql = `SELECT ROUND(SUM(AMOUNT)::numeric,2) AS CARRYOVER_AMOUNT
               FROM balance_carryover WHERE IS_ACTIVE = 1`;
  const { rows } = await query(sql);
  return rows[0];
}

// ===== TRANSACTION CRUD =====

export async function createTransaction(t: {
  TRANSACTION_DATE: string;
  CHECK_NMBR: string;
  DESCRIPTION: string;
  NOTES: string;
  MULTI_PART_TRAN_TOTAL: number;
  POSTED_FLAG: number;
  TRAN_TYPE: string;
  DEBIT: number;
  CREDIT: number;
}) {
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

export async function updateTransaction(
  id: number,
  t: {
    TRANSACTION_DATE: string;
    CHECK_NMBR: string;
    DESCRIPTION: string;
    NOTES: string;
    MULTI_PART_TRAN_TOTAL: number;
    POSTED_FLAG: number;
    TRAN_TYPE: string;
    DEBIT: number;
    CREDIT: number;
  }
) {
  const sql = `UPDATE transactions SET
    TRANSACTION_DATE = $1, CHECK_NMBR = $2, DESCRIPTION = $3,
    NOTES = $4, MULTI_PART_TRAN_TOTAL = $5, POSTED_FLAG = $6,
    TRAN_TYPE = $7, DEBIT = $8, CREDIT = $9
    WHERE ID_TRANSACTIONS = $10`;
  await query(sql, [
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
  ]);
}

export async function deleteTransactions(ids: number[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `DELETE FROM transactions WHERE ID_TRANSACTIONS IN (${placeholders})`;
  await query(sql, ids);
}

export async function deleteLastTransaction() {
  const { rows } = await query(
    "SELECT MAX(ID_TRANSACTIONS) AS maxid FROM transactions"
  );
  const maxId = rows[0]?.MAXID;
  if (maxId) {
    await query("DELETE FROM transactions WHERE ID_TRANSACTIONS = $1", [
      maxId,
    ]);
  }
  return maxId;
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
