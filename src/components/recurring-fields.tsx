"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RecurringDraft } from "@/lib/recurring-draft";

interface Props {
  prefix: string;
  value: RecurringDraft;
  onChange: (value: RecurringDraft) => void;
  template?: boolean;
}

export function RecurringFields({
  prefix,
  value,
  onChange,
  template = false,
}: Props) {
  const id = (field: string) => `${prefix}-${field}`;
  function update<K extends keyof RecurringDraft>(
    field: K,
    next: RecurringDraft[K],
  ) {
    onChange({ ...value, [field]: next });
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 [&_input]:min-h-11 [&_input]:text-base">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("description")}>Description (required)</Label>
        <Input
          id={id("description")}
          name={id("description")}
          value={value.description}
          required
          maxLength={100}
          onChange={(e) => update("description", e.target.value.toUpperCase())}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("category")}>Category (required)</Label>
        <Input
          id={id("category")}
          name={id("category")}
          list="recurring-categories"
          value={value.category}
          required
          maxLength={50}
          onChange={(e) => update("category", e.target.value)}
        />
      </div>
      {template ? (
        <div className="space-y-2">
          <Label htmlFor={id("day")}>Day of month (required)</Label>
          <Input
            id={id("day")}
            name={id("day")}
            type="number"
            min="1"
            max="31"
            step="1"
            required
            value={value.day}
            onChange={(e) => update("day", e.target.value)}
            aria-describedby={id("day-help")}
          />
          <p id={id("day-help")} className="text-sm text-muted-foreground">
            Shorter months use their last day.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={id("date")}>Transaction date (required)</Label>
          <Input
            id={id("date")}
            name={id("date")}
            type="date"
            required
            value={value.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Income or expense</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name={id("direction")}
              value="debit"
              checked={value.direction === "debit"}
              onChange={() => update("direction", "debit")}
            />
            Expense (debit)
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name={id("direction")}
              value="credit"
              checked={value.direction === "credit"}
              onChange={() => update("direction", "credit")}
            />
            Income (credit)
          </label>
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor={id("amount")}>
          {template ? "Default amount (optional)" : "Amount (required)"}
        </Label>
        <Input
          id={id("amount")}
          name={id("amount")}
          type="number"
          inputMode="decimal"
          min="0"
          max="99999999.99"
          step="0.01"
          required={!template}
          value={value.amount}
          onChange={(e) => update("amount", e.target.value)}
          aria-describedby={template ? id("amount-help") : undefined}
        />
        {template && (
          <p id={id("amount-help")} className="text-sm text-muted-foreground">
            Leave empty for a variable bill. Enter its amount during review.
          </p>
        )}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("notes")}>Notes (optional)</Label>
        <Textarea
          id={id("notes")}
          name={id("notes")}
          maxLength={200}
          value={value.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          name={id("posted")}
          checked={value.posted}
          onChange={(e) => update("posted", e.target.checked)}
        />
        {template ? "Posted by default" : "Posted"}
      </label>
      {!template && (
        <details className="sm:col-span-2">
          <summary className="cursor-pointer py-2 text-sm">
            Additional fields
          </summary>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={id("check")}>Check number (optional)</Label>
              <Input
                id={id("check")}
                name={id("check")}
                maxLength={10}
                value={value.checkNumber}
                onChange={(e) => update("checkNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={id("multi")}>Multi-part total (optional)</Label>
              <Input
                id={id("multi")}
                name={id("multi")}
                type="number"
                inputMode="decimal"
                min="0"
                max="99999999.99"
                step="0.01"
                value={value.multiPartTotal}
                onChange={(e) => update("multiPartTotal", e.target.value)}
              />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
