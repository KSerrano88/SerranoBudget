import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/queries", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/queries")>(),
  bulkUpdateTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransactions: vi.fn(),
  getTransactionsByIds: vi.fn(),
  getBalanceSheet: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createTransaction, updateTransaction, bulkUpdateTransactions, TransactionNotFoundError } from "@/lib/queries";
import { POST } from "@/app/api/transactions/route";
import { PUT as update } from "@/app/api/transactions/[id]/route";
import { PUT as bulkUpdate } from "@/app/api/transactions/bulk/route";
import { toInputDate } from "@/lib/format";

const minimal = {
  TRANSACTION_DATE: "2024-02-29",
  DESCRIPTION: "Groceries",
  TRAN_TYPE: "Food",
};
const normalized = {
  ...minimal,
  CHECK_NMBR: "",
  NOTES: "",
  MULTI_PART_TRAN_TOTAL: 0,
  POSTED_FLAG: 0,
  DEBIT: 0,
  CREDIT: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { name: "test" } } as never);
  vi.mocked(createTransaction).mockResolvedValue(42);
  vi.mocked(bulkUpdateTransactions).mockResolvedValue(1);
});

const routes = [
  {
    name: "create",
    status: 201,
    send: (body: Record<string, unknown>) => POST(new NextRequest(
      "http://localhost/api/transactions",
      { method: "POST", body: JSON.stringify(body) }
    )),
  },
  {
    name: "update",
    status: 200,
    send: (body: Record<string, unknown>) => update(new NextRequest(
      "http://localhost/api/transactions/42",
      { method: "PUT", body: JSON.stringify(body) }
    ), { params: Promise.resolve({ id: "42" }) }),
  },
  {
    name: "bulk update",
    status: 200,
    send: (body: Record<string, unknown>) => bulkUpdate(new NextRequest(
      "http://localhost/api/transactions/bulk",
      { method: "PUT", body: JSON.stringify({ transactions: [{ ...body, id: 42 }] }) }
    )),
  },
];

describe.each(routes)("$name transaction validation", ({ name, status, send }) => {
  it("passes defaults to persistence and removes unknown fields", async () => {
    const response = await send({ ...minimal, EXTRA_FIELD: "ignored" });
    expect(response.status).toBe(status);
    if (name === "create") {
      expect(createTransaction).toHaveBeenCalledExactlyOnceWith(normalized);
      expect(await response.json()).toEqual({ id: 42 });
    } else if (name === "bulk update") {
      expect(bulkUpdateTransactions).toHaveBeenCalledExactlyOnceWith([{ id: 42, ...normalized }]);
      expect(await response.json()).toEqual({ success: true, count: 1 });
    } else {
      expect(updateTransaction).toHaveBeenCalledExactlyOnceWith(42, normalized);
    }
  });

  it.each([
    { DESCRIPTION: "A".repeat(101) },
    { CHECK_NMBR: "1".repeat(11) },
    { NOTES: "A".repeat(201) },
    { TRAN_TYPE: "A".repeat(51) },
    { TRANSACTION_DATE: "2024-02-30" },
    { TRANSACTION_DATE: "2023-02-29" },
    { TRANSACTION_DATE: "2024-02-29T00:00:00.000Z" },
    { DEBIT: -1 },
    { CREDIT: -1 },
    { POSTED_FLAG: 2 },
  ])("rejects invalid input before persistence: %j", async (invalid) => {
    const response = await send({ ...minimal, ...invalid });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Invalid input",
      messages: expect.arrayContaining([expect.any(String)]),
    });
    expect(createTransaction).not.toHaveBeenCalled();
    expect(updateTransaction).not.toHaveBeenCalled();
    expect(bulkUpdateTransactions).not.toHaveBeenCalled();
  });

  it("preserves supplied amounts and posted status", async () => {
    const amounts = {
      DEBIT: 12.34,
      CREDIT: 56.78,
      MULTI_PART_TRAN_TOTAL: -9.5,
      POSTED_FLAG: 1,
    };
    const response = await send({ ...minimal, ...amounts });
    expect(response.status).toBe(status);
    if (name === "create") {
      expect(createTransaction).toHaveBeenCalledExactlyOnceWith({ ...normalized, ...amounts });
    } else if (name === "bulk update") {
      expect(bulkUpdateTransactions).toHaveBeenCalledExactlyOnceWith([{ id: 42, ...normalized, ...amounts }]);
    } else {
      expect(updateTransaction).toHaveBeenCalledExactlyOnceWith(42, { ...normalized, ...amounts });
    }
  });

  it("accepts text at all database limits", async () => {
    const response = await send({
      ...minimal,
      DESCRIPTION: "A".repeat(100),
      CHECK_NMBR: "1".repeat(10),
      NOTES: "A".repeat(200),
      TRAN_TYPE: "A".repeat(50),
    });
    expect(response.status).toBe(status);
  });

  it("accepts a stored date converted for editing", async () => {
    const response = await send({
      ...minimal,
      TRANSACTION_DATE: toInputDate("2024-02-29T00:00:00.000Z"),
    });
    expect(response.status).toBe(status);
  });

  it("requires authentication before writes", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const response = await send(minimal);
    expect(response.status).toBe(401);
    expect(createTransaction).not.toHaveBeenCalled();
    expect(updateTransaction).not.toHaveBeenCalled();
    expect(bulkUpdateTransactions).not.toHaveBeenCalled();
  });
});

it("validates the whole batch before saving the first row", async () => {
  const response = await bulkUpdate(new NextRequest(
    "http://localhost/api/transactions/bulk",
    {
      method: "PUT",
      body: JSON.stringify({ transactions: [
        { ...minimal, id: 1 },
        { ...minimal, id: 2, TRANSACTION_DATE: "2024-04-31" },
      ] }),
    }
  ));
  expect(response.status).toBe(400);
  expect(updateTransaction).not.toHaveBeenCalled();
    expect(bulkUpdateTransactions).not.toHaveBeenCalled();
});

function bulkRequest(transactions: Record<string, unknown>[]) {
  return new NextRequest("http://localhost/api/transactions/bulk", {
    method: "PUT",
    body: JSON.stringify({ transactions }),
  });
}

it("rejects duplicate IDs before saving", async () => {
  const response = await bulkUpdate(bulkRequest([
    { ...minimal, id: 1 },
    { ...minimal, id: 1 },
  ]));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    messages: ["transactions.1.id: Duplicate transaction ID"],
  });
  expect(bulkUpdateTransactions).not.toHaveBeenCalled();
});

it("reports a missing transaction after the save rolls back", async () => {
  vi.mocked(bulkUpdateTransactions).mockRejectedValue(new TransactionNotFoundError(42));
  const response = await bulkUpdate(bulkRequest([{ ...minimal, id: 42 }]));
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Transaction not found", id: 42 });
});

it("hides database details when a bulk save fails", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    vi.mocked(bulkUpdateTransactions).mockRejectedValue(new Error("private database detail"));
    const response = await bulkUpdate(bulkRequest([{ ...minimal, id: 42 }]));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  } finally {
    log.mockRestore();
  }
});
