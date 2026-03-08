"use client";

import { Transaction } from "@/lib/types";
import { formatCurrency, formatDate, toInputDate } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionTableProps {
  transactions: Transaction[];
  selectable?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  editable?: boolean;
  editData?: Record<number, Partial<Transaction>>;
  onEditChange?: (id: number, field: string, value: string | number) => void;
}

export function TransactionTable({
  transactions,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  editable = false,
  editData,
  onEditChange,
}: TransactionTableProps) {
  const allSelected =
    transactions.length > 0 &&
    selectedIds?.size === transactions.length;

  // Hide secondary columns on mobile in view mode, but show all columns in edit mode
  const hideOnMobile = editable ? "" : "hidden md:table-cell";

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onToggleSelectAll?.()}
                />
              </TableHead>
            )}
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Posted</TableHead>
            <TableHead className={hideOnMobile}>Check #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className={hideOnMobile}>Notes</TableHead>
            <TableHead className={hideOnMobile}>Multi-Part</TableHead>
            <TableHead className={hideOnMobile}>Type</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={selectable ? 10 : 9}
                className="text-center text-muted-foreground py-8"
              >
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((t) => {
              const isEditing =
                editable && editData && t.ID_TRANSACTIONS in editData;
              const data = isEditing
                ? { ...t, ...editData![t.ID_TRANSACTIONS] }
                : t;

              return (
                <TableRow key={t.ID_TRANSACTIONS}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds?.has(t.ID_TRANSACTIONS) || false}
                        onCheckedChange={() =>
                          onToggleSelect?.(t.ID_TRANSACTIONS)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="date"
                        value={toInputDate(data.TRANSACTION_DATE)}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "TRANSACTION_DATE",
                            e.target.value
                          )
                        }
                        className="w-36"
                      />
                    ) : (
                      formatDate(data.TRANSACTION_DATE)
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Checkbox
                        checked={data.POSTED_FLAG === 1}
                        onCheckedChange={(checked) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "POSTED_FLAG",
                            checked ? 1 : 0
                          )
                        }
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex justify-center">
                            {data.POSTED_FLAG === 1 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {data.POSTED_FLAG === 1 ? "Posted" : "Unposted"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className={hideOnMobile}>
                    {isEditing ? (
                      <Input
                        value={data.CHECK_NMBR || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "CHECK_NMBR",
                            e.target.value
                          )
                        }
                        className="w-20"
                      />
                    ) : (
                      data.CHECK_NMBR || ""
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={data.DESCRIPTION}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "DESCRIPTION",
                            e.target.value.toUpperCase()
                          )
                        }
                        className="w-40"
                        maxLength={100}
                      />
                    ) : (
                      data.DESCRIPTION
                    )}
                  </TableCell>
                  <TableCell className={hideOnMobile}>
                    {isEditing ? (
                      <Input
                        value={data.NOTES || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "NOTES",
                            e.target.value
                          )
                        }
                        className="w-36"
                        maxLength={200}
                      />
                    ) : (
                      data.NOTES || ""
                    )}
                  </TableCell>
                  <TableCell className={hideOnMobile}>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data.MULTI_PART_TRAN_TOTAL || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "MULTI_PART_TRAN_TOTAL",
                            e.target.value
                          )
                        }
                        className="w-24"
                        step="0.01"
                      />
                    ) : data.MULTI_PART_TRAN_TOTAL ? (
                      formatCurrency(data.MULTI_PART_TRAN_TOTAL)
                    ) : (
                      ""
                    )}
                  </TableCell>
                  <TableCell className={hideOnMobile}>
                    {isEditing ? (
                      <Input
                        value={data.TRAN_TYPE || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "TRAN_TYPE",
                            e.target.value
                          )
                        }
                        className="w-28"
                      />
                    ) : (
                      data.TRAN_TYPE
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data.DEBIT || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "DEBIT",
                            e.target.value
                          )
                        }
                        className="w-24 text-right"
                        step="0.01"
                      />
                    ) : data.DEBIT > 0 ? (
                      <span className="text-red-600">
                        {formatCurrency(data.DEBIT)}
                      </span>
                    ) : (
                      ""
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data.CREDIT || ""}
                        onChange={(e) =>
                          onEditChange?.(
                            t.ID_TRANSACTIONS,
                            "CREDIT",
                            e.target.value
                          )
                        }
                        className="w-24 text-right"
                        step="0.01"
                      />
                    ) : data.CREDIT > 0 ? (
                      <span className="text-green-600">
                        {formatCurrency(data.CREDIT)}
                      </span>
                    ) : (
                      ""
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
