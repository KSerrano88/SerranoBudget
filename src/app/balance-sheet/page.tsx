"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Transaction } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { SummaryBar } from "@/components/summary-bar";
import { TransactionTable } from "@/components/transaction-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type PostStatus = "all" | "posted" | "unposted";

interface Summary {
  rangeSummary: {
    SUM_DEBIT: number;
    SUM_CREDIT: number;
    DIFFERENCE: number;
  };
  totalBalance: { TOTAL_BAL: number };
  postedBalance: { TOTAL_POSTED_BAL: number };
  carryOver: { CARRYOVER_AMOUNT: number };
}

export default function BalanceSheetPage() {
  const [numDays, setNumDays] = useState(30);
  const [numDaysInput, setNumDaysInput] = useState("30");
  const [postStatus, setPostStatus] = useState<PostStatus>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<
    Record<number, Partial<Transaction>>
  >({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [transRes, summaryRes] = await Promise.all([
      fetch(`/api/transactions?days=${numDays}&postStatus=${postStatus}`),
      fetch(`/api/transactions/summary?days=${numDays}&postStatus=${postStatus}`),
    ]);
    const transData = await transRes.json();
    const summaryData = await summaryRes.json();
    setTransactions(transData.transactions);
    setSummary(summaryData);
    setLoading(false);
  }, [numDays, postStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleToggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleSelectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.ID_TRANSACTIONS)));
    }
  }

  function handleEditSelected() {
    const data: Record<number, Partial<Transaction>> = {};
    for (const id of selectedIds) {
      const t = transactions.find((tr) => tr.ID_TRANSACTIONS === id);
      if (t) {
        data[id] = { ...t };
      }
    }
    setEditData(data);
    setEditing(true);
  }

  function handleEditChange(id: number, field: string, value: string | number) {
    setEditData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  }

  async function handleUpdateSelected() {
    const updates = Object.entries(editData).map(([idStr, data]) => ({
      id: Number(idStr),
      TRANSACTION_DATE: data.TRANSACTION_DATE || "",
      CHECK_NMBR: data.CHECK_NMBR || "",
      DESCRIPTION: data.DESCRIPTION || "",
      NOTES: data.NOTES || "",
      MULTI_PART_TRAN_TOTAL: Number(data.MULTI_PART_TRAN_TOTAL) || 0,
      POSTED_FLAG: Number(data.POSTED_FLAG) || 0,
      TRAN_TYPE: data.TRAN_TYPE || "",
      DEBIT: Number(data.DEBIT) || 0,
      CREDIT: Number(data.CREDIT) || 0,
    }));

    const res = await fetch("/api/transactions/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: updates }),
    });

    if (res.ok) {
      toast.success("Transactions updated");
      setEditing(false);
      setEditData({});
      setSelectedIds(new Set());
      fetchData();
    } else {
      toast.error("Failed to update transactions");
    }
  }

  async function handleDeleteSelected() {
    const res = await fetch("/api/transactions/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });

    if (res.ok) {
      toast.success("Transactions deleted");
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      fetchData();
    } else {
      toast.error("Failed to delete transactions");
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const days = Number(numDaysInput);
      if (days > 0) {
        setNumDays(days);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [numDaysInput]);

  const today = new Date().toISOString().split("T")[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);
  const startDateStr = startDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
        <div className="flex items-end gap-4 mt-2">
          <div className="flex flex-col items-center">
            <Label htmlFor="numDays" className="text-xs text-muted-foreground">
              Prior Days
            </Label>
            <Input
              id="numDays"
              type="number"
              value={numDaysInput}
              onChange={(e) => setNumDaysInput(e.target.value)}
              className="w-14 h-7 bg-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <p className="text-[13px] text-muted-foreground mb-[6px]">
            {postStatus === "unposted"
              ? "Showing all unposted transactions"
              : `${formatDate(startDateStr)} — ${formatDate(today)}`}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6">
          {summary && (
            <SummaryBar
              sumDebit={summary.rangeSummary?.SUM_DEBIT || 0}
              sumCredit={summary.rangeSummary?.SUM_CREDIT || 0}
              difference={summary.rangeSummary?.DIFFERENCE || 0}
              postedBalance={summary.postedBalance?.TOTAL_POSTED_BAL}
              totalBalance={summary.totalBalance?.TOTAL_BAL}
              carryOver={summary.carryOver?.CARRYOVER_AMOUNT}
            />
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant={postStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setPostStatus("all")}
              >
                All
              </Button>
              <Button
                variant={postStatus === "posted" ? "default" : "outline"}
                size="sm"
                onClick={() => setPostStatus("posted")}
              >
                Posted
              </Button>
              <Button
                variant={postStatus === "unposted" ? "default" : "outline"}
                size="sm"
                onClick={() => setPostStatus("unposted")}
              >
                Unposted
              </Button>
            </div>

            <div className="flex gap-2">
              {!editing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={handleEditSelected}
                  >
                    Edit Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    Delete Selected
                  </Button>
                </>
              )}
              {editing && (
                <>
                  <Button size="sm" onClick={handleUpdateSelected}>
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setEditData({});
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading transactions...</p>
          ) : (
            <TransactionTable
              transactions={
                editing
                  ? transactions.filter((t) =>
                      selectedIds.has(t.ID_TRANSACTIONS)
                    )
                  : transactions
              }
              selectable={!editing}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              editable={editing}
              editData={editData}
              onEditChange={handleEditChange}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected
              transaction(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
