import type { RecurringTemplate, TemplateInput } from "./recurring-input";
import { templateDate } from "./recurring-input";
import type { Transaction } from "./types";

export interface RecurringDraft {
  templateId?: number;
  description: string;
  category: string;
  direction: "debit" | "credit";
  amount: string;
  notes: string;
  posted: boolean;
  day: string;
  date: string;
  checkNumber: string;
  multiPartTotal: string;
}

export function emptyRecurringDraft(): RecurringDraft {
  return {
    description: "",
    category: "",
    direction: "debit",
    amount: "",
    notes: "",
    posted: false,
    day: String(new Date().getDate()),
    date: "",
    checkNumber: "",
    multiPartTotal: "",
  };
}

export function draftFromTemplate(
  template: RecurringTemplate,
  month: string,
): RecurringDraft {
  return {
    ...emptyRecurringDraft(),
    templateId: template.ID_TEMPLATE,
    description: template.DESCRIPTION,
    category: template.TRAN_TYPE,
    direction: template.DIRECTION,
    amount: template.AMOUNT === null ? "" : String(template.AMOUNT),
    notes: template.NOTES,
    posted: template.POSTED_FLAG === 1,
    day: String(template.DAY_OF_MONTH),
    date: templateDate(month, template.DAY_OF_MONTH),
  };
}

export function draftFromTransaction(transaction: Transaction): RecurringDraft {
  return {
    ...emptyRecurringDraft(),
    description: transaction.DESCRIPTION,
    category: transaction.TRAN_TYPE,
    notes: transaction.NOTES || "",
    direction: transaction.CREDIT > 0 ? "credit" : "debit",
    amount: String(
      transaction.CREDIT > 0 ? transaction.CREDIT : transaction.DEBIT,
    ),
    day: String(Number(transaction.TRANSACTION_DATE.slice(8, 10))),
  };
}

export function templateValues(draft: RecurringDraft): TemplateInput {
  return {
    DESCRIPTION: draft.description,
    TRAN_TYPE: draft.category,
    DIRECTION: draft.direction,
    AMOUNT: draft.amount.trim() === "" ? null : Number(draft.amount),
    NOTES: draft.notes,
    POSTED_FLAG: draft.posted ? 1 : 0,
    DAY_OF_MONTH: Number(draft.day),
  };
}

export function reviewValues(draft: RecurringDraft) {
  return {
    ...templateValues(draft),
    TEMPLATE_ID: draft.templateId,
    TRANSACTION_DATE: draft.date,
    CHECK_NMBR: draft.checkNumber,
    MULTI_PART_TRAN_TOTAL:
      draft.multiPartTotal.trim() === "" ? 0 : Number(draft.multiPartTotal),
  };
}
