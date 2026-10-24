import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/queries", () => ({ getBalanceSheet: vi.fn() }));

import { auth } from "@/lib/auth";
import { getBalanceSheet } from "@/lib/queries";
import { GET } from "@/app/api/transactions/balance-sheet/route";
import { GET as list } from "@/app/api/transactions/route";
import { GET as summary } from "@/app/api/transactions/summary/route";

const data = { transactions: [], summary: { rangeSummary: { SUM_DEBIT: 10 } } };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { name: "test" } } as never);
  vi.mocked(getBalanceSheet).mockResolvedValue(data as never);
});

describe.each([
  { name: "balance sheet", handle: GET, expected: data },
  { name: "transaction list", handle: list, expected: { transactions: [] } },
  { name: "summary", handle: summary, expected: data.summary },
])("$name read route", ({ handle, expected }) => {
  function request(query = "") {
    return handle(new NextRequest(`http://localhost/api/transactions?${query}`));
  }

  it("uses the same default filters and preserves its response shape", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(getBalanceSheet).toHaveBeenCalledExactlyOnceWith({ days: 30, postStatus: "all" });
    expect(await response.json()).toEqual(expected);
  });

  it.each(["all", "posted", "unposted"])("passes the %s filter to the read module", async (postStatus) => {
    expect((await request(`days=0&postStatus=${postStatus}`)).status).toBe(200);
    expect(getBalanceSheet).toHaveBeenCalledExactlyOnceWith({ days: 0, postStatus });
  });

  it.each(["days=-1", "days=3651", "days=NaN", "days=Infinity", "days=abc", "postStatus=invalid"])("rejects invalid filters: %s", async (query) => {
    const response = await request(query);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Invalid input" });
    expect(getBalanceSheet).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await request()).status).toBe(401);
    expect(getBalanceSheet).not.toHaveBeenCalled();
  });

  it("returns a safe error when the database fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.mocked(getBalanceSheet).mockRejectedValue(new Error("private database detail"));
      const response = await request();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
    } finally {
      log.mockRestore();
    }
  });
});
