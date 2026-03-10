import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing queries
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  default: {},
}));

import { query } from "@/lib/db";
import {
  getBalanceSheetTransactions,
  getDateRangeSummary,
  getTotalBalance,
  getPostedBalance,
  getCarryOver,
  createTransaction,
  updateTransaction,
  deleteTransactions,
  deleteLastTransaction,
  getTransactionsByIds,
  getTransactionTypes,
  getTransactionTypesRanked,
  getTransactionHistory,
  getVisualizationData,
} from "@/lib/queries";

const mockQuery = vi.mocked(query);

beforeEach(() => {
  vi.clearAllMocks();
});

// ===== Balance Sheet Queries =====

describe("getBalanceSheetTransactions", () => {
  it("queries all transactions with date filter for 'all' status", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ID_TRANSACTIONS: 1 }] } as never);

    await getBalanceSheetTransactions(30, "all");

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRANSACTION_DATE >= $1");
    expect(sql).not.toContain("POSTED_FLAG");
    expect(params).toHaveLength(1);
  });

  it("filters by POSTED_FLAG = 1 for 'posted' status", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getBalanceSheetTransactions(30, "posted");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("POSTED_FLAG = 1");
    expect(sql).toContain("TRANSACTION_DATE >= $1");
    expect(params).toHaveLength(1);
  });

  it("filters by POSTED_FLAG = 0 for 'unposted' status without date filter", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getBalanceSheetTransactions(30, "unposted");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("POSTED_FLAG = 0");
    expect(sql).not.toContain("TRANSACTION_DATE >= $1");
    expect(params).toHaveLength(0);
  });

  it("returns rows from query result", async () => {
    const mockRows = [
      { ID_TRANSACTIONS: 1, DESCRIPTION: "Test" },
      { ID_TRANSACTIONS: 2, DESCRIPTION: "Test 2" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows } as never);

    const result = await getBalanceSheetTransactions(30, "all");
    expect(result).toEqual(mockRows);
  });
});

describe("getDateRangeSummary", () => {
  it("returns first row for 'all' status", async () => {
    const summary = { SUM_DEBIT: 100, SUM_CREDIT: 200, DIFFERENCE: 100 };
    mockQuery.mockResolvedValue({ rows: [summary] } as never);

    const result = await getDateRangeSummary(30, "all");
    expect(result).toEqual(summary);
  });

  it("uses POSTED_FLAG filter for 'posted' status", async () => {
    mockQuery.mockResolvedValue({ rows: [{}] } as never);

    await getDateRangeSummary(30, "posted");

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("POSTED_FLAG = 1");
  });

  it("omits date filter for 'unposted' status", async () => {
    mockQuery.mockResolvedValue({ rows: [{}] } as never);

    await getDateRangeSummary(30, "unposted");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("POSTED_FLAG = 0");
    expect(params).toHaveLength(0);
  });
});

describe("getTotalBalance", () => {
  it("returns aggregate balance with carryover", async () => {
    const balance = { SUM_DEBIT: 500, SUM_CREDIT: 1000, DIFFERENCE: 500, TOTAL_BAL: 1500 };
    mockQuery.mockResolvedValue({ rows: [balance] } as never);

    const result = await getTotalBalance();
    expect(result).toEqual(balance);
  });
});

describe("getPostedBalance", () => {
  it("returns posted-only balance", async () => {
    const balance = { POSTED_DEBIT: 300, POSTED_CREDIT: 800, TOTAL_POSTED_BAL: 1500 };
    mockQuery.mockResolvedValue({ rows: [balance] } as never);

    const result = await getPostedBalance();
    expect(result).toEqual(balance);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("POSTED_FLAG = 1");
  });
});

describe("getCarryOver", () => {
  it("returns carryover amount", async () => {
    mockQuery.mockResolvedValue({ rows: [{ CARRYOVER_AMOUNT: 5000 }] } as never);

    const result = await getCarryOver();
    expect(result).toEqual({ CARRYOVER_AMOUNT: 5000 });
  });
});

// ===== Transaction CRUD =====

describe("createTransaction", () => {
  it("inserts a transaction and returns the new ID", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ID_TRANSACTIONS: 42 }] } as never);

    const id = await createTransaction({
      TRANSACTION_DATE: "2024-01-15",
      CHECK_NMBR: "1001",
      DESCRIPTION: "Groceries",
      NOTES: "",
      MULTI_PART_TRAN_TOTAL: 0,
      POSTED_FLAG: 0,
      TRAN_TYPE: "Food",
      DEBIT: 50,
      CREDIT: 0,
    });

    expect(id).toBe(42);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO transactions");
    expect(sql).toContain("RETURNING ID_TRANSACTIONS");
    expect(params).toHaveLength(9);
    expect(params![0]).toBe("2024-01-15");
    expect(params![7]).toBe(50); // DEBIT
  });
});

describe("updateTransaction", () => {
  it("updates a transaction by ID", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await updateTransaction(42, {
      TRANSACTION_DATE: "2024-01-16",
      CHECK_NMBR: "",
      DESCRIPTION: "Updated",
      NOTES: "",
      MULTI_PART_TRAN_TOTAL: 0,
      POSTED_FLAG: 1,
      TRAN_TYPE: "Food",
      DEBIT: 75,
      CREDIT: 0,
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("UPDATE transactions SET");
    expect(sql).toContain("WHERE ID_TRANSACTIONS = $10");
    expect(params).toHaveLength(10);
    expect(params![9]).toBe(42); // ID is last param
  });
});

describe("deleteTransactions", () => {
  it("deletes multiple transactions by IDs", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await deleteTransactions([1, 2, 3]);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("DELETE FROM transactions");
    expect(sql).toContain("IN ($1,$2,$3)");
    expect(params).toEqual([1, 2, 3]);
  });

  it("does nothing when given empty array", async () => {
    await deleteTransactions([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("handles single ID", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await deleteTransactions([99]);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("IN ($1)");
    expect(params).toEqual([99]);
  });
});

describe("deleteLastTransaction", () => {
  it("finds max ID and deletes it", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ MAXID: 100 }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const result = await deleteLastTransaction();

    expect(result).toBe(100);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [deleteSql, deleteParams] = mockQuery.mock.calls[1];
    expect(deleteSql).toContain("DELETE FROM transactions");
    expect(deleteParams).toEqual([100]);
  });

  it("returns undefined when no transactions exist", async () => {
    mockQuery.mockResolvedValue({ rows: [{ MAXID: null }] } as never);

    const result = await deleteLastTransaction();

    expect(result).toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe("getTransactionsByIds", () => {
  it("returns transactions matching given IDs", async () => {
    const mockRows = [
      { ID_TRANSACTIONS: 1, DESCRIPTION: "A" },
      { ID_TRANSACTIONS: 3, DESCRIPTION: "C" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows } as never);

    const result = await getTransactionsByIds([1, 3]);

    expect(result).toEqual(mockRows);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("IN ($1,$2)");
    expect(params).toEqual([1, 3]);
  });

  it("returns empty array for empty input", async () => {
    const result = await getTransactionsByIds([]);
    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ===== Transaction Types =====

describe("getTransactionTypes", () => {
  it("returns sorted distinct transaction types", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { TRAN_TYPE: "Food" },
        { TRAN_TYPE: "Gas" },
        { TRAN_TYPE: "Income" },
      ],
    } as never);

    const result = await getTransactionTypes();
    expect(result).toEqual(["Food", "Gas", "Income"]);
  });

  it("filters out null/empty types", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { TRAN_TYPE: "Food" },
        { TRAN_TYPE: null },
        { TRAN_TYPE: "" },
        { TRAN_TYPE: "Gas" },
      ],
    } as never);

    const result = await getTransactionTypes();
    expect(result).toEqual(["Food", "Gas"]);
  });
});

describe("getTransactionTypesRanked", () => {
  it("splits types into top N and rest", async () => {
    const types = Array.from({ length: 15 }, (_, i) => ({
      TRAN_TYPE: `Type${i}`,
      CNT: String(100 - i),
    }));
    mockQuery.mockResolvedValue({ rows: types } as never);

    const result = await getTransactionTypesRanked(10);

    expect(result.top).toHaveLength(10);
    expect(result.rest).toHaveLength(5);
    expect(result.top[0]).toBe("Type0");
    expect(result.top[9]).toBe("Type9");
  });

  it("returns all in top when fewer than topN types exist", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { TRAN_TYPE: "A", CNT: "10" },
        { TRAN_TYPE: "B", CNT: "5" },
      ],
    } as never);

    const result = await getTransactionTypesRanked(10);

    expect(result.top).toEqual(["A", "B"]);
    expect(result.rest).toEqual([]);
  });

  it("sorts rest alphabetically", async () => {
    const types = [
      { TRAN_TYPE: "Top1", CNT: "100" },
      { TRAN_TYPE: "Zebra", CNT: "5" },
      { TRAN_TYPE: "Apple", CNT: "3" },
      { TRAN_TYPE: "Mango", CNT: "1" },
    ];
    mockQuery.mockResolvedValue({ rows: types } as never);

    const result = await getTransactionTypesRanked(1);

    expect(result.top).toEqual(["Top1"]);
    expect(result.rest).toEqual(["Apple", "Mango", "Zebra"]);
  });
});

// ===== Transaction History =====

describe("getTransactionHistory", () => {
  it("queries with date range only when no type filter", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getTransactionHistory({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });

    expect(mockQuery).toHaveBeenCalledTimes(2); // detail + summary
    const [detailSql, detailParams] = mockQuery.mock.calls[0];
    expect(detailSql).toContain("TRANSACTION_DATE >= $1");
    expect(detailSql).toContain("TRANSACTION_DATE <= $2");
    expect(detailSql).not.toContain("TRAN_TYPE");
    expect(detailParams).toEqual(["2024-01-01", "2024-12-31"]);
  });

  it("adds exact type filter when tranType is provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getTransactionHistory({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranType: "Food",
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRAN_TYPE = $3");
    expect(params).toEqual(["2024-01-01", "2024-12-31", "Food"]);
  });

  it("adds LIKE filter when tranTypeContains is provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getTransactionHistory({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranTypeContains: "Food",
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRAN_TYPE LIKE $3");
    expect(params).toEqual(["2024-01-01", "2024-12-31", "%Food%"]);
  });

  it("combines both filters when both are provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getTransactionHistory({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranType: "Food",
      tranTypeContains: "Groc",
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRAN_TYPE = $3");
    expect(sql).toContain("TRAN_TYPE LIKE $4");
    expect(params).toEqual(["2024-01-01", "2024-12-31", "Food", "%Groc%"]);
  });

  it("returns transactions and summary", async () => {
    const transactions = [{ ID_TRANSACTIONS: 1 }];
    const summary = { SUM_DEBIT: 50, SUM_CREDIT: 100, DIFFERENCE: 50 };
    mockQuery
      .mockResolvedValueOnce({ rows: transactions } as never)
      .mockResolvedValueOnce({ rows: [summary] } as never);

    const result = await getTransactionHistory({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });

    expect(result.transactions).toEqual(transactions);
    expect(result.summary).toEqual(summary);
  });
});

// ===== Visualization =====

describe("getVisualizationData", () => {
  it("queries with date range and no type filter", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getVisualizationData({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranTypes: [],
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRANSACTION_DATE >= $1");
    expect(sql).toContain("TRANSACTION_DATE <= $2");
    expect(sql).not.toContain("TRAN_TYPE IN");
    expect(params).toEqual(["2024-01-01", "2024-12-31"]);
  });

  it("adds IN clause when tranTypes are provided", async () => {
    mockQuery.mockResolvedValue({ rows: [] } as never);

    await getVisualizationData({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranTypes: ["Food", "Gas", "Income"],
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("TRAN_TYPE IN ($3,$4,$5)");
    expect(params).toEqual(["2024-01-01", "2024-12-31", "Food", "Gas", "Income"]);
  });

  it("returns typed row data", async () => {
    const rows = [
      { TRAN_TYPE: "Food", MONTH: "2024-01", TOTAL_DEBIT: 200, TOTAL_CREDIT: 0 },
    ];
    mockQuery.mockResolvedValue({ rows } as never);

    const result = await getVisualizationData({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      tranTypes: [],
    });

    expect(result).toEqual(rows);
  });
});
