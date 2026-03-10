import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

// Replicate the schemas from the API routes to test them independently
const createTransactionSchema = z.object({
  TRANSACTION_DATE: z.iso.date(),
  CHECK_NMBR: z.string().max(50).optional().default(""),
  DESCRIPTION: z.string().min(1).max(500),
  NOTES: z.string().max(1000).optional().default(""),
  MULTI_PART_TRAN_TOTAL: z.number().optional().default(0),
  POSTED_FLAG: z.number().int().min(0).max(1).optional().default(0),
  TRAN_TYPE: z.string().min(1).max(100),
  DEBIT: z.number().min(0).optional().default(0),
  CREDIT: z.number().min(0).optional().default(0),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().min(1)).min(1).max(500),
});

describe("createTransactionSchema", () => {
  const validTransaction = {
    TRANSACTION_DATE: "2024-01-15",
    DESCRIPTION: "Groceries",
    TRAN_TYPE: "Food",
    DEBIT: 50,
  };

  it("accepts a valid minimal transaction", () => {
    const result = createTransactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = createTransactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CHECK_NMBR).toBe("");
      expect(result.data.NOTES).toBe("");
      expect(result.data.MULTI_PART_TRAN_TOTAL).toBe(0);
      expect(result.data.POSTED_FLAG).toBe(0);
      expect(result.data.CREDIT).toBe(0);
    }
  });

  it("accepts a full transaction with all fields", () => {
    const result = createTransactionSchema.safeParse({
      TRANSACTION_DATE: "2024-06-15",
      CHECK_NMBR: "1234",
      DESCRIPTION: "Rent payment",
      NOTES: "June rent",
      MULTI_PART_TRAN_TOTAL: 0,
      POSTED_FLAG: 1,
      TRAN_TYPE: "Housing",
      DEBIT: 1500,
      CREDIT: 0,
    });
    expect(result.success).toBe(true);
  });

  // Required field validation
  it("rejects missing TRANSACTION_DATE", () => {
    const result = createTransactionSchema.safeParse({
      DESCRIPTION: "Test",
      TRAN_TYPE: "Food",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing DESCRIPTION", () => {
    const result = createTransactionSchema.safeParse({
      TRANSACTION_DATE: "2024-01-15",
      TRAN_TYPE: "Food",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing TRAN_TYPE", () => {
    const result = createTransactionSchema.safeParse({
      TRANSACTION_DATE: "2024-01-15",
      DESCRIPTION: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty DESCRIPTION", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DESCRIPTION: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty TRAN_TYPE", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      TRAN_TYPE: "",
    });
    expect(result.success).toBe(false);
  });

  // Type validation
  it("rejects non-string DESCRIPTION", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DESCRIPTION: 12345,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-number DEBIT", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DEBIT: "fifty",
    });
    expect(result.success).toBe(false);
  });

  // Range validation
  it("rejects negative DEBIT", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DEBIT: -50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative CREDIT", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      CREDIT: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects POSTED_FLAG > 1", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      POSTED_FLAG: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects POSTED_FLAG < 0", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      POSTED_FLAG: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer POSTED_FLAG", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      POSTED_FLAG: 0.5,
    });
    expect(result.success).toBe(false);
  });

  // Length validation
  it("rejects DESCRIPTION over 500 chars", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DESCRIPTION: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts DESCRIPTION at exactly 500 chars", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      DESCRIPTION: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects TRAN_TYPE over 100 chars", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      TRAN_TYPE: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects CHECK_NMBR over 50 chars", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      CHECK_NMBR: "1".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects NOTES over 1000 chars", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      NOTES: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  // Date format validation
  it("rejects invalid date format", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      TRANSACTION_DATE: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects MM-DD-YYYY format", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      TRANSACTION_DATE: "01-15-2024",
    });
    expect(result.success).toBe(false);
  });

  // Empty body
  it("rejects empty object", () => {
    const result = createTransactionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // Extra fields are stripped
  it("ignores extra fields", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      EXTRA_FIELD: "should be ignored",
    });
    expect(result.success).toBe(true);
  });
});

describe("bulkDeleteSchema", () => {
  it("accepts valid array of positive integers", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [1, 2, 3] });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it("rejects negative IDs", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [-1] });
    expect(result.success).toBe(false);
  });

  it("rejects zero ID", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [0] });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer IDs", () => {
    const result = bulkDeleteSchema.safeParse({ ids: [1.5] });
    expect(result.success).toBe(false);
  });

  it("rejects string IDs", () => {
    const result = bulkDeleteSchema.safeParse({ ids: ["abc"] });
    expect(result.success).toBe(false);
  });

  it("rejects arrays over 500 items", () => {
    const ids = Array.from({ length: 501 }, (_, i) => i + 1);
    const result = bulkDeleteSchema.safeParse({ ids });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 500 items", () => {
    const ids = Array.from({ length: 500 }, (_, i) => i + 1);
    const result = bulkDeleteSchema.safeParse({ ids });
    expect(result.success).toBe(true);
  });

  it("rejects missing ids field", () => {
    const result = bulkDeleteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
