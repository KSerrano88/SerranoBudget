import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/queries")>()),
  bulkUpdateTransactions: vi.fn(),
  deleteTransactions: vi.fn(),
  getRecurringDuplicates: vi.fn(),
  createRecurringTransactions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import * as queries from "@/lib/queries";
import { DELETE, PUT } from "@/app/api/transactions/bulk/route";
import { POST as checkRecurring } from "@/app/api/recurring-transactions/check/route";
import { POST as addRecurring } from "@/app/api/recurring-transactions/route";

const routes = [
  {
    name: "bulk update",
    path: "/api/transactions/bulk",
    method: "PUT",
    field: "transactions",
    handle: PUT,
  },
  {
    name: "bulk delete",
    path: "/api/transactions/bulk",
    method: "DELETE",
    field: "ids",
    handle: DELETE,
  },
  {
    name: "recurring duplicate check",
    path: "/api/recurring-transactions/check",
    method: "POST",
    field: "transactions",
    handle: checkRecurring,
  },
  {
    name: "recurring batch",
    path: "/api/recurring-transactions",
    method: "POST",
    field: "transactions",
    handle: addRecurring,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { name: "test" } } as never);
});

function expectNoPersistence() {
  expect(queries.bulkUpdateTransactions).not.toHaveBeenCalled();
  expect(queries.deleteTransactions).not.toHaveBeenCalled();
  expect(queries.getRecurringDuplicates).not.toHaveBeenCalled();
  expect(queries.createRecurringTransactions).not.toHaveBeenCalled();
}

describe.each(routes)("$name oversized requests", (route) => {
  function request(size: number) {
    return new NextRequest(`http://localhost${route.path}`, {
      method: route.method,
      body: JSON.stringify({
        requestId: "8b4f5fb4-bc35-4ad7-a319-74ae5f0dd0d0",
        [route.field]: Array(size).fill(null),
      }),
    });
  }

  it.each([501, 10_000])(
    "returns one collection error for %i invalid items without persistence",
    async (size) => {
      const response = await route.handle(request(size));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid input");
      expect(body.messages.length).toBe(1);
      expect(body.messages[0]).toMatch(new RegExp(`^${route.field}:`));
      expectNoPersistence();
    },
  );

  it("requires authentication before parsing the oversized body", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const input = request(10_000);
    const parseBody = vi.spyOn(input, "json");
    expect((await route.handle(input)).status).toBe(401);
    expect(parseBody).not.toHaveBeenCalled();
    expectNoPersistence();
  });
});
