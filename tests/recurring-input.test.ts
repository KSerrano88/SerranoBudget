import { describe, expect, it } from "vitest";
import {
  currentMonth,
  templateDate,
  templateSchema,
  recurringBatchSchema,
} from "@/lib/recurring-input";
import {
  draftFromTemplate,
  draftFromTransaction,
  reviewValues,
} from "@/lib/recurring-draft";
import type { Transaction } from "@/lib/types";

const template = {
  ID_TEMPLATE: 1,
  DESCRIPTION: "RENT",
  TRAN_TYPE: "Housing",
  DIRECTION: "debit" as const,
  AMOUNT: 1450,
  NOTES: "Monthly rent",
  DAY_OF_MONTH: 31,
  POSTED_FLAG: 0 as const,
};

describe("recurring transaction dates and defaults", () => {
  it.each([
    ["2026-02", "2026-02-28"],
    ["2024-02", "2024-02-29"],
    ["2026-04", "2026-04-30"],
    ["2026-12", "2026-12-31"],
  ])("clamps day 31 in %s", (month, expected) =>
    expect(templateDate(month, 31)).toBe(expected),
  );
  it("uses the local calendar month", () => {
    const now = new Date(2026, 9, 31, 23, 59);
    expect(currentMonth(now)).toBe("2026-10");
  });
  it("leaves variable amounts empty and restores each template's posted default", () => {
    const draft = draftFromTemplate(
      { ...template, AMOUNT: null, POSTED_FLAG: 1 },
      "2026-02",
    );
    expect(draft).toMatchObject({
      amount: "",
      date: "2026-02-28",
      posted: true,
      checkNumber: "",
      multiPartTotal: "",
    });
    draft.amount = "42.50";
    draft.description = "CHANGED";
    expect(template.DESCRIPTION).toBe("RENT");
    expect(reviewValues(draft)).toMatchObject({
      AMOUNT: 42.5,
      POSTED_FLAG: 1,
      MULTI_PART_TRAN_TOTAL: 0,
    });
  });
  it("copies an existing income transaction without its check, multi-part total, or posted status", () => {
    const source = {
      TRANSACTION_DATE: "2026-10-15T00:00:00.000Z",
      DESCRIPTION: "PAY",
      TRAN_TYPE: "Income",
      CREDIT: 2000,
      DEBIT: 0,
      NOTES: "Salary",
      POSTED_FLAG: 1,
      CHECK_NMBR: "42",
      MULTI_PART_TRAN_TOTAL: 3000,
    } as Transaction;
    expect(draftFromTransaction(source)).toMatchObject({
      direction: "credit",
      amount: "2000",
      day: "15",
      posted: false,
      checkNumber: "",
      multiPartTotal: "",
    });
  });
});

describe("recurring input validation", () => {
  it("allows a template without an amount, but rejects it during review", () => {
    expect(
      templateSchema.safeParse({ ...template, AMOUNT: null }).success,
    ).toBe(true);
    expect(
      recurringBatchSchema.safeParse({
        requestId: crypto.randomUUID(),
        transactions: [
          reviewValues(
            draftFromTemplate({ ...template, AMOUNT: null }, "2026-02"),
          ),
        ],
      }).success,
    ).toBe(false);
  });
  it.each([-1, 100000000, 1.001, Infinity, NaN])(
    "rejects invalid amount %s",
    (AMOUNT) => {
      expect(templateSchema.safeParse({ ...template, AMOUNT }).success).toBe(
        false,
      );
    },
  );
  it.each([0, 32, 1.5])("rejects invalid saved day %s", (DAY_OF_MONTH) => {
    expect(
      templateSchema.safeParse({ ...template, DAY_OF_MONTH }).success,
    ).toBe(false);
  });
  it("rejects whitespace-only descriptions and categories", () => {
    expect(
      templateSchema.safeParse({ ...template, DESCRIPTION: " " }).success,
    ).toBe(false);
    expect(
      templateSchema.safeParse({ ...template, TRAN_TYPE: " " }).success,
    ).toBe(false);
  });
});
