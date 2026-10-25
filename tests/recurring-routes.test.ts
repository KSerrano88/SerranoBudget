import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/queries")>()),
  getRecurringTemplates: vi.fn(),
  createRecurringTemplate: vi.fn(),
  updateRecurringTemplate: vi.fn(),
  deleteRecurringTemplate: vi.fn(),
  createRecurringTransactions: vi.fn(),
  getRecurringDuplicates: vi.fn(),
}));
import { auth } from "@/lib/auth";
import * as queries from "@/lib/queries";
import { POST as add } from "@/app/api/recurring-transactions/route";
import { POST as check } from "@/app/api/recurring-transactions/check/route";
import {
  GET as list,
  POST as create,
} from "@/app/api/recurring-transactions/templates/route";
import {
  PUT as update,
  DELETE as remove,
} from "@/app/api/recurring-transactions/templates/[id]/route";

const context = (id = "1") => ({ params: Promise.resolve({ id }) });
function request(body: unknown, method = "POST") {
  return new NextRequest("http://localhost/api/recurring-transactions", {
    method,
    body: JSON.stringify(body),
  });
}
const template = {
  DESCRIPTION: "RENT",
  TRAN_TYPE: "Housing",
  DIRECTION: "debit",
  AMOUNT: null,
  DAY_OF_MONTH: 31,
};
const batch = {
  requestId: crypto.randomUUID(),
  transactions: [
    {
      TEMPLATE_ID: 1,
      DESCRIPTION: "RENT",
      TRAN_TYPE: "Housing",
      DIRECTION: "debit",
      AMOUNT: 1000,
      TRANSACTION_DATE: "2026-02-28",
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { name: "test" } } as never);
});

describe("recurring API authentication", () => {
  it("rejects unauthenticated reads and writes before persistence", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const responses = await Promise.all([
      list(),
      create(request(template)),
      update(request(template, "PUT"), context()),
      remove(request({}, "DELETE"), context()),
      check(request(batch)),
      add(request(batch)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401,
    ]);
    expect(queries.createRecurringTransactions).not.toHaveBeenCalled();
    expect(queries.createRecurringTemplate).not.toHaveBeenCalled();
  });
});

describe("recurring API validation and responses", () => {
  it("creates a variable template with unposted defaults", async () => {
    const response = await create(request(template));
    expect(response.status).toBe(201);
    expect(queries.createRecurringTemplate).toHaveBeenCalledWith({
      ...template,
      NOTES: "",
      POSTED_FLAG: 0,
    });
  });
  it("rejects blank review amounts before saving", async () => {
    expect(
      (
        await add(
          request({
            ...batch,
            transactions: [{ ...batch.transactions[0], AMOUNT: null }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(queries.createRecurringTransactions).not.toHaveBeenCalled();
  });
  it("rejects invalid calendar dates", async () => {
    expect(
      (
        await add(
          request({
            ...batch,
            transactions: [
              { ...batch.transactions[0], TRANSACTION_DATE: "2026-02-30" },
            ],
          }),
        )
      ).status,
    ).toBe(400);
    expect(queries.createRecurringTransactions).not.toHaveBeenCalled();
  });
  it.each(["0", "1.5", "NaN"])("rejects invalid template ID %s", async (id) => {
    expect((await update(request(template, "PUT"), context(id))).status).toBe(
      400,
    );
    expect((await remove(request({}, "DELETE"), context(id))).status).toBe(400);
  });
  it("returns 404 for a template that was removed", async () => {
    vi.mocked(queries.updateRecurringTemplate).mockResolvedValue(null);
    vi.mocked(queries.deleteRecurringTemplate).mockResolvedValue(false);
    expect((await update(request(template, "PUT"), context())).status).toBe(
      404,
    );
    expect((await remove(request({}, "DELETE"), context())).status).toBe(404);
  });
  it("returns a reviewable duplicate warning", async () => {
    const duplicates = [{ templateId: 1, month: "2026-02" }];
    vi.mocked(queries.createRecurringTransactions).mockRejectedValue(
      new queries.RecurringDuplicateError(duplicates),
    );
    const response = await add(request(batch));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ duplicates });
  });
  it("returns the saved count", async () => {
    vi.mocked(queries.createRecurringTransactions).mockResolvedValue(1);
    const response = await add(request(batch));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ count: 1 });
  });
  it("rejects malformed JSON as invalid input", async () => {
    const response = await add(
      new NextRequest("http://localhost/api/recurring-transactions", {
        method: "POST",
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
  });
});
