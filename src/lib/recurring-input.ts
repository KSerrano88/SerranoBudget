import { z } from "zod/v4";

const money = z.number().min(0).max(99999999.99).multipleOf(0.01);
const fields = {
  DESCRIPTION: z.string().trim().min(1).max(100),
  TRAN_TYPE: z.string().trim().min(1).max(50),
  DIRECTION: z.enum(["debit", "credit"]),
  AMOUNT: money,
  NOTES: z.string().max(200).default(""),
  POSTED_FLAG: z.union([z.literal(0), z.literal(1)]).default(0),
};

export const templateSchema = z.object({
  ...fields,
  AMOUNT: money.nullable(),
  DAY_OF_MONTH: z.number().int().min(1).max(31),
});

export const recurringReviewSchema = z.object({
  ...fields,
  TEMPLATE_ID: z.number().int().positive(),
  TRANSACTION_DATE: z.iso.date(),
  CHECK_NMBR: z.string().max(10).default(""),
  MULTI_PART_TRAN_TOTAL: money.default(0),
});

export const recurringCheckSchema = z.object({
  transactions: z
    .array(
      z.object({
        TEMPLATE_ID: z.number().int().positive(),
        TRANSACTION_DATE: z.iso.date(),
      }),
    )
    .min(1)
    .max(500),
});

export const recurringBatchSchema = z.object({
  requestId: z.uuid(),
  allowDuplicates: z.boolean().default(false),
  transactions: z.array(recurringReviewSchema).min(1).max(500),
});

export type TemplateInput = z.output<typeof templateSchema>;
export type RecurringTemplate = TemplateInput & { ID_TEMPLATE: number };
export type RecurringReview = z.output<typeof recurringReviewSchema>;
export type RecurringBatch = z.output<typeof recurringBatchSchema>;
export type RecurringCheck = z.output<
  typeof recurringCheckSchema
>["transactions"];
export type RecurringDuplicate = { templateId: number; month: string };

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function templateDate(month: string, day: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  const lastDay = date.getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
