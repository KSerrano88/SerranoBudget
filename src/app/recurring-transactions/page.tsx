"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecurringFields } from "@/components/recurring-fields";
import { RecurringTemplateEditor } from "@/components/recurring-template-editor";
import {
  currentMonth,
  recurringBatchSchema,
  recurringCheckSchema,
  type RecurringTemplate,
  type RecurringDuplicate,
} from "@/lib/recurring-input";
import {
  draftFromTemplate,
  draftFromTransaction,
  emptyRecurringDraft,
  reviewValues,
  type RecurringDraft,
} from "@/lib/recurring-draft";
import { addedTransactionsUrl } from "@/lib/added-transactions";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export default function RecurringTransactionsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [month, setMonth] = useState("");
  const [editor, setEditor] = useState<{
    draft: RecurringDraft;
    id?: number;
    remaining?: RecurringDraft[];
    position?: number;
    total?: number;
  } | null>(null);
  const [review, setReview] = useState<RecurringDraft[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState<{
    key: string;
    duplicates: RecurringDuplicate[];
    error?: string;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState("");
  const request = useRef<{ signature: string; id: string } | null>(null);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/recurring-transactions/templates", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load templates.");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setTemplates(data.templates);
        setMonth(currentMonth());
        const from = new URLSearchParams(window.location.search).get("from");
        if (from) {
          const source = await fetch(
            `/api/transactions/bulk?ids=${encodeURIComponent(from)}`,
            {
              signal: controller.signal,
              cache: "no-store",
            },
          );
          if (!source.ok)
            throw new Error("Could not load the selected transactions.");
          const { transactions }: { transactions: Transaction[] } =
            await source.json();
          const ids = [...new Set(from.split(",").map(Number))];
          const drafts = ids.map((id) =>
            draftFromTransaction(
              transactions.find((row) => row.ID_TRANSACTIONS === id)!,
            ),
          );
          if (!controller.signal.aborted)
            setEditor({
              draft: drafts[0],
              remaining: drafts.slice(1),
              position: 1,
              total: drafts.length,
            });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load templates.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    fetch("/api/transactions/types", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) return response.json();
      })
      .then((data) => {
        if (data && !controller.signal.aborted) setCategories(data.types);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [reload]);

  const checkKey = review
    ? JSON.stringify(
        review.map((row) => ({
          TEMPLATE_ID: row.templateId,
          TRANSACTION_DATE: row.date,
        })),
      )
    : "";
  useEffect(() => {
    if (!checkKey) return;
    const parsed = recurringCheckSchema.safeParse({
      transactions: JSON.parse(checkKey),
    });
    if (!parsed.success) return;
    const controller = new AbortController();
    fetch("/api/recurring-transactions/check", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Could not check for duplicates. The app will check again when you add the group.",
          );
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setCheck({ key: checkKey, duplicates: data.duplicates });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setCheck({ key: checkKey, duplicates: [], error: error.message });
      });
    return () => controller.abort();
  }, [checkKey]);

  const view = editor ? "editor" : review ? "review" : "list";
  useEffect(() => {
    heading.current?.focus();
  }, [view]);
  const currentCheck = check?.key === checkKey ? check : null;
  const duplicates = currentCheck?.duplicates ?? [];
  const warningKey = `${checkKey}:${JSON.stringify(duplicates)}`;
  const allowDuplicates = duplicates.length > 0 && acknowledged === warningKey;

  function closeEditor() {
    setEditor(null);
    router.replace("/recurring-transactions");
  }
  function startReview() {
    setReview(
      templates
        .filter((t) => selected.has(t.ID_TEMPLATE))
        .map((t) => draftFromTemplate(t, month)),
    );
    request.current = null;
    setCheck(null);
    setAcknowledged("");
    setError("");
  }
  async function removeTemplate() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/recurring-transactions/templates/${deleteTarget.ID_TEMPLATE}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not delete the template.");
      setTemplates((rows) =>
        rows.filter((t) => t.ID_TEMPLATE !== deleteTarget.ID_TEMPLATE),
      );
      setSelected(
        (ids) =>
          new Set([...ids].filter((id) => id !== deleteTarget.ID_TEMPLATE)),
      );
      setDeleteTarget(null);
      toast.success("Template deleted. Existing transactions are unchanged.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not delete the template.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!review || submitting.current) return;
    setError("");
    if (duplicates.length && !allowDuplicates) {
      setError(
        "Review and accept the duplicate warning before adding this group.",
      );
      return;
    }
    const transactions = review.map(reviewValues);
    const signature = JSON.stringify(transactions);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    const parsed = recurringBatchSchema.safeParse({
      transactions,
      requestId: request.current.id,
      allowDuplicates,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(". "),
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.duplicates) {
          setCheck({ key: checkKey, duplicates: data.duplicates });
          setAcknowledged("");
        }
        throw new Error(
          data.messages?.join(". ") || data.error || "Could not add the group.",
        );
      }
      router.push(
        addedTransactionsUrl(
          data.count,
          data.ids || [],
          review.map((row) => row.date),
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not add the group. Your review changes are still here.",
      );
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-bold focus:outline-none"
        >
          Recurring Transactions
        </h1>
        <p className="mt-2 text-muted-foreground">
          Save templates for bills and income. Select them, review the details,
          and add them together.
        </p>
      </div>
      <datalist id="recurring-categories">
        {[...new Set([...categories, ...templates.map((t) => t.TRAN_TYPE)])]
          .sort()
          .map((category) => (
            <option key={category} value={category} />
          ))}
      </datalist>
      {loading ? (
        <p role="status">Loading templates...</p>
      ) : loadError ? (
        <div role="alert" className="space-y-3">
          <p>{loadError}</p>
          <Button onClick={() => setReload((value) => value + 1)}>Retry</Button>
        </div>
      ) : editor ? (
        <RecurringTemplateEditor
          key={
            editor.id ?? (editor.position ? `source-${editor.position}` : "new")
          }
          initial={editor.draft}
          templateId={editor.id}
          progress={
            editor.position && editor.total
              ? { current: editor.position, total: editor.total }
              : undefined
          }
          onCancel={closeEditor}
          onSaved={(saved) => {
            setTemplates((rows) =>
              [
                ...rows.filter((t) => t.ID_TEMPLATE !== saved.ID_TEMPLATE),
                saved,
              ].sort(
                (a, b) =>
                  a.DESCRIPTION.localeCompare(b.DESCRIPTION) ||
                  a.ID_TEMPLATE - b.ID_TEMPLATE,
              ),
            );
            if (editor.remaining?.length) {
              setEditor({
                draft: editor.remaining[0],
                remaining: editor.remaining.slice(1),
                position: editor.position! + 1,
                total: editor.total,
              });
            } else {
              closeEditor();
            }
            toast.success("Template saved");
          }}
        />
      ) : review ? (
        <form onSubmit={addGroup} className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Review {review.length} transaction{review.length === 1 ? "" : "s"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Changes here apply only to this group. Saved templates stay
              unchanged.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {currentCheck?.error && (
            <p role="status" className="text-sm">
              {currentCheck.error}
            </p>
          )}
          {!currentCheck && (
            <p role="status" className="text-sm text-muted-foreground">
              Checking for duplicates...
            </p>
          )}
          {duplicates.length > 0 && (
            <div
              role="status"
              className="space-y-3 rounded-lg border border-amber-500 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
            >
              <p className="font-semibold">
                These templates already have transactions in the reviewed month:
              </p>
              <ul className="list-disc pl-5">
                {duplicates.map((duplicate) => (
                  <li key={`${duplicate.templateId}-${duplicate.month}`}>
                    {templates.find(
                      (t) => t.ID_TEMPLATE === duplicate.templateId,
                    )?.DESCRIPTION ?? "Template"}{" "}
                    — {duplicate.month}
                  </li>
                ))}
              </ul>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowDuplicates}
                  disabled={busy}
                  onChange={(event) =>
                    setAcknowledged(event.target.checked ? warningKey : "")
                  }
                />
                I reviewed the warning. Add these transactions again.
              </label>
            </div>
          )}
          <fieldset disabled={busy} className="space-y-5">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="review-month">Month for all transactions</Label>
              <Input
                id="review-month"
                type="month"
                value={month}
                required
                onChange={(event) => {
                  const next = event.target.value;
                  setMonth(next);
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(next))
                    setReview((rows) =>
                      rows!.map((row) => ({
                        ...row,
                        date: draftFromTemplate(
                          templates.find(
                            (t) => t.ID_TEMPLATE === row.templateId,
                          )!,
                          next,
                        ).date,
                      })),
                    );
                }}
              />
              <p className="text-sm text-muted-foreground">
                Changing this month resets dates to the saved days. You can then
                change each date.
              </p>
            </div>
            {review.map((row, index) => (
              <Card key={row.templateId}>
                <CardHeader>
                  <CardTitle>
                    {index + 1}.{" "}
                    {
                      templates.find((t) => t.ID_TEMPLATE === row.templateId)
                        ?.DESCRIPTION
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecurringFields
                    prefix={`review-${row.templateId}`}
                    value={row}
                    onChange={(next) => {
                      setReview((rows) =>
                        rows!.map((value, i) => (i === index ? next : value)),
                      );
                    }}
                  />
                </CardContent>
              </Card>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                {busy
                  ? "Adding..."
                  : `Add ${review.length} transaction${review.length === 1 ? "" : "s"}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReview(null);
                  setError("");
                }}
              >
                Back to templates
              </Button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                required
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                setEditor({ draft: emptyRecurringDraft() });
                setError("");
              }}
            >
              Create template
            </Button>
          </div>
          {error && !deleteTarget && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {templates.length === 0 ? (
            <Card>
              <CardContent className="space-y-2">
                <p>No saved templates yet.</p>
                <p className="text-sm text-muted-foreground">
                  Create a template here, or select transactions on the Balance
                  Sheet and choose “Save as Template”. You can also save a
                  transaction from History.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.size === templates.length}
                    onChange={(event) =>
                      setSelected(
                        new Set(
                          event.target.checked
                            ? templates.map((t) => t.ID_TEMPLATE)
                            : [],
                        ),
                      )
                    }
                  />
                  Select all templates
                </label>
                <Button
                  disabled={
                    !selected.size || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
                  }
                  onClick={startReview}
                >
                  Add Selected Transactions ({selected.size})
                </Button>
              </div>
              <ul className="space-y-3">
                {templates.map((template) => (
                  <li
                    key={template.ID_TEMPLATE}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
                  >
                    <label className="flex min-h-11 min-w-0 flex-1 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(template.ID_TEMPLATE)}
                        onChange={(event) => {
                          setSelected((ids) => {
                            const next = new Set(ids);
                            if (event.target.checked)
                              next.add(template.ID_TEMPLATE);
                            else next.delete(template.ID_TEMPLATE);
                            return next;
                          });
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block break-words">
                          <span className="font-semibold">
                            {template.DESCRIPTION}
                          </span>
                          {template.NOTES && (
                            <span className="text-muted-foreground">
                              {" · "}{template.NOTES}
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Day {template.DAY_OF_MONTH} · {template.TRAN_TYPE} ·{" "}
                          {template.DIRECTION === "credit"
                            ? "Income"
                            : "Expense"}{" "}
                          ·{" "}
                          {template.AMOUNT === null
                            ? "Enter amount during review"
                            : formatCurrency(template.AMOUNT)}{" "}
                          · {template.POSTED_FLAG ? "Posted" : "Unposted"}
                        </span>
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        aria-label={`Edit ${template.DESCRIPTION}`}
                        onClick={() =>
                          setEditor({
                            id: template.ID_TEMPLATE,
                            draft: draftFromTemplate(
                              template,
                              /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
                                ? month
                                : currentMonth(),
                            ),
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        aria-label={`Delete ${template.DESCRIPTION}`}
                        onClick={() => {
                          setDeleteTarget(template);
                          setError("");
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.DESCRIPTION}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved template. Existing transactions will stay
              unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={removeTemplate}
            >
              {busy ? "Deleting..." : "Delete template"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
