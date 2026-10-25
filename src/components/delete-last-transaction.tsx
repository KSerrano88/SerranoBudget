"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { notifyTransactionsChanged } from "@/hooks/use-transaction-revision";

export function DeleteLastTransaction() {
  const [open, setOpen] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  async function load() {
    if (busy.current) return;
    busy.current = true;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/transactions/last", { cache: "no-store" });
      if (!response.ok) throw new Error("Read failed");
      const data = await response.json();
      setTransaction(data.transaction);
      if (!data.transaction) {
        setOpen(false);
        toast.info("There are no transactions to delete");
      }
    } catch {
      setError("Failed to load the last transaction. Please try again.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function remove() {
    if (busy.current || !transaction) return;
    busy.current = true;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/transactions/last", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transaction.ID_TRANSACTIONS }),
      });
      if (!response.ok && response.status !== 404) throw new Error("Delete failed");
      setOpen(false);
      setTransaction(null);
      notifyTransactionsChanged();
      if (response.status === 404) toast.info("This transaction was already deleted");
      else toast.success("Last transaction deleted");
    } catch {
      setError("Failed to delete this transaction. Please try again.");
    } finally {
      busy.current = false;
      setDeleting(false);
    }
  }

  return (
    <>
      <SidebarMenuButton
        ref={trigger}
        className="min-h-11 py-3 text-[13px] font-semibold text-red-300 hover:text-red-200"
        onClick={() => { setTransaction(null); void load(); }}
        disabled={loading || deleting}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span>Delete Last Transaction</span>
      </SidebarMenuButton>
      <AlertDialog open={open} onOpenChange={(value) => {
        if (!busy.current) setOpen(value);
      }}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Last Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the transaction shown below? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {loading && <p role="status">Loading transaction...</p>}
          {transaction && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt>Description</dt><dd className="break-words">{transaction.DESCRIPTION}</dd>
              <dt>Date</dt><dd>{formatDate(transaction.TRANSACTION_DATE)}</dd>
              <dt>Debit</dt><dd>{formatCurrency(transaction.DEBIT)}</dd>
              <dt>Credit</dt><dd>{formatCurrency(transaction.CREDIT)}</dd>
            </dl>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading || deleting}>Cancel</AlertDialogCancel>
            {transaction ? (
              <Button variant="destructive" disabled={deleting} onClick={() => void remove()}>
                {deleting ? "Deleting..." : error ? "Retry" : "Delete"}
              </Button>
            ) : error && <Button onClick={() => void load()}>Retry</Button>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
