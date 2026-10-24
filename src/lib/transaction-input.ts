import { z } from "zod/v4";

export const transactionSchema = z.object({
  TRANSACTION_DATE: z.iso.date(),
  CHECK_NMBR: z.string().max(10).optional().default(""),
  DESCRIPTION: z.string().min(1).max(100),
  NOTES: z.string().max(200).optional().default(""),
  MULTI_PART_TRAN_TOTAL: z.number().optional().default(0),
  POSTED_FLAG: z.union([z.literal(0), z.literal(1)]).optional().default(0),
  TRAN_TYPE: z.string().min(1).max(50),
  DEBIT: z.number().min(0).optional().default(0),
  CREDIT: z.number().min(0).optional().default(0),
});

export const bulkUpdateSchema = z.object({
  transactions: z.array(
    transactionSchema.extend({ id: z.number().int().min(1) })
  ).min(1).max(500).superRefine((transactions, context) => {
    const seen = new Set<number>();
    transactions.forEach(({ id }, index) => {
      if (seen.has(id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Duplicate transaction ID",
        });
      }
      seen.add(id);
    });
  }),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().min(1)).min(1).max(500),
});

export type TransactionInput = z.input<typeof transactionSchema>;
export type ValidatedTransaction = z.output<typeof transactionSchema>;

export type BulkTransaction = z.output<typeof bulkUpdateSchema>["transactions"][number];
