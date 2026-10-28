import { describe, expect, it, vi } from "vitest";
import { bulkDeleteSchema, bulkUpdateSchema } from "@/lib/transaction-input";
import { recurringBatchSchema, recurringCheckSchema } from "@/lib/recurring-input";

const transaction = {
  TRANSACTION_DATE: "2026-10-28",
  DESCRIPTION: "Validation test",
  TRAN_TYPE: "Test",
};
const requestId = "8b4f5fb4-bc35-4ad7-a319-74ae5f0dd0d0";

const inputs = [
  {
    name: "bulk update",
    schema: bulkUpdateSchema,
    field: "transactions",
    payload: (items: unknown[]) => ({ transactions: items }),
    item: (index: number) => ({ ...transaction, id: index + 1 }),
  },
  {
    name: "bulk delete",
    schema: bulkDeleteSchema,
    field: "ids",
    payload: (items: unknown[]) => ({ ids: items }),
    item: (index: number) => index + 1,
  },
  {
    name: "recurring duplicate check",
    schema: recurringCheckSchema,
    field: "transactions",
    payload: (items: unknown[]) => ({ transactions: items }),
    item: (index: number) => ({
      TEMPLATE_ID: index + 1,
      TRANSACTION_DATE: "2026-10-28",
    }),
  },
  {
    name: "recurring batch",
    schema: recurringBatchSchema,
    field: "transactions",
    payload: (items: unknown[]) => ({ requestId, transactions: items }),
    item: (index: number) => ({
      ...transaction,
      TEMPLATE_ID: index + 1,
      DIRECTION: "debit",
      AMOUNT: 1,
    }),
  },
];

describe.each(inputs)("$name collection bounds", ({ schema, field, payload, item }) => {
  it.each([1, 500])("accepts %i valid items", (size) => {
    const items = Array.from({ length: size }, (_, index) => item(index));
    expect(schema.safeParse(payload(items)).success).toBe(true);
  });

  it("rejects an empty collection", () => {
    const result = schema.safeParse(payload([]));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected an invalid collection");
    expect(result.error.issues[0]).toMatchObject({
      code: "too_small",
      path: [field],
      minimum: 1,
    });
  });

  it("still validates individual items within the size limit", () => {
    const result = schema.safeParse(payload([null]));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected an invalid item");
    expect(result.error.issues[0]).toMatchObject({
      code: "invalid_type",
      path: [field, 0],
    });
  });

  it.each([501, 10_000])(
    "rejects %i invalid items before reading any element",
    (size) => {
      const items = Array<unknown>(size).fill(null);
      const readFirstItem = vi.fn(() => null);
      Object.defineProperty(items, 0, { get: readFirstItem });

      const result = schema.safeParse(payload(items));
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected an oversized collection");
      expect(readFirstItem).not.toHaveBeenCalled();
      expect(result.error.issues.length).toBe(1);
      expect(result.error.issues[0]).toMatchObject({
        code: "too_big",
        path: [field],
        maximum: 500,
      });
    },
  );
});
