import { describe, expect, it } from "vitest";
import {
  addedTransactionsUrl,
  parseAddedTransactions,
} from "@/lib/added-transactions";

describe("added transaction feedback", () => {
  it("carries the saved count and exact IDs and expands the date range for older rows", () => {
    const url = new URL(
      addedTransactionsUrl(
        2,
        [42, 43],
        ["2026-08-01", "2026-10-24"],
        new Date("2026-10-24T12:00:00Z"),
      ),
      "http://localhost",
    );
    expect(parseAddedTransactions(url.searchParams)).toEqual({
      count: 2,
      ids: [42, 43],
      days: 86,
    });
  });
  it.each([
    "added=0",
    "added=501",
    "added=2&newIds=1,1",
    "added=1&newIds=1,2",
    "added=1&newIds=-1",
    "added=1&days=9999",
  ])("ignores invalid feedback parameters %s", (query) => {
    expect(parseAddedTransactions(new URLSearchParams(query))).toBeNull();
  });
});
