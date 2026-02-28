export interface Transaction {
  ID_TRANSACTIONS: number;
  TRANSACTION_DATE: string;
  CHECK_NMBR: string;
  DESCRIPTION: string;
  NOTES: string;
  MULTI_PART_TRAN_TOTAL: number;
  POSTED_FLAG: 0 | 1;
  TRAN_TYPE: string;
  DEBIT: number;
  CREDIT: number;
}

export interface TransactionInput {
  TRANSACTION_DATE: string;
  CHECK_NMBR?: string;
  DESCRIPTION: string;
  NOTES?: string;
  MULTI_PART_TRAN_TOTAL?: number;
  POSTED_FLAG: 0 | 1;
  TRAN_TYPE: string;
  DEBIT: number;
  CREDIT: number;
}

export interface BalanceSummary {
  SUM_DEBIT: number;
  SUM_CREDIT: number;
  DIFFERENCE: number;
}

export interface TotalBalance extends BalanceSummary {
  TOTAL_BAL: number;
}

export interface PostedBalance {
  POSTED_DEBIT: number;
  POSTED_CREDIT: number;
  TOTAL_POSTED_BAL: number;
}

export interface CarryOver {
  CARRYOVER_AMOUNT: number;
}

export interface MonthlyRollup {
  month: number;
  year: number;
  monthName: string;
  debits: Array<{ TRAN_TYPE: string; SUM_DEBIT: number }>;
  credits: Array<{ TRAN_TYPE: string; SUM_CREDIT: number }>;
}
