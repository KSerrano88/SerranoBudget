import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { updateTransaction, deleteTransactions } from "@/lib/queries";
import { requireAuth, errorResponse, isCalendarDate, validationError } from "@/lib/api-utils";

const bulkUpdateSchema = z.object({
  transactions: z
    .array(
      z.object({
        id: z.number().int().min(1),
        TRANSACTION_DATE: z.iso.date(),
        CHECK_NMBR: z.string().max(50).optional().default(""),
        DESCRIPTION: z.string().min(1).max(500),
        NOTES: z.string().max(1000).optional().default(""),
        MULTI_PART_TRAN_TOTAL: z.number().optional().default(0),
        POSTED_FLAG: z.number().int().min(0).max(1).optional().default(0),
        TRAN_TYPE: z.string().min(1).max(100),
        DEBIT: z.number().min(0).optional().default(0),
        CREDIT: z.number().min(0).optional().default(0),
      })
    )
    .min(1)
    .max(500),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().min(1)).min(1).max(500),
});

function toDateOnly(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    for (const t of parsed.data.transactions) {
      if (!isCalendarDate(t.TRANSACTION_DATE)) {
        return NextResponse.json(
          { error: "Invalid calendar date" },
          { status: 400 }
        );
      }
    }

    for (const t of parsed.data.transactions) {
      await updateTransaction(t.id, {
        TRANSACTION_DATE: toDateOnly(t.TRANSACTION_DATE),
        CHECK_NMBR: t.CHECK_NMBR || "",
        DESCRIPTION: t.DESCRIPTION,
        NOTES: t.NOTES || "",
        MULTI_PART_TRAN_TOTAL: t.MULTI_PART_TRAN_TOTAL || 0,
        POSTED_FLAG: t.POSTED_FLAG || 0,
        TRAN_TYPE: t.TRAN_TYPE,
        DEBIT: t.DEBIT || 0,
        CREDIT: t.CREDIT || 0,
      });
    }

    return NextResponse.json({
      success: true,
      count: parsed.data.transactions.length,
    });
  } catch (error) {
    return errorResponse(error, "Bulk update error");
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await deleteTransactions(parsed.data.ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Bulk delete error");
  }
}
