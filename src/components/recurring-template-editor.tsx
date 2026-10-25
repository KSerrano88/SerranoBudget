"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RecurringFields } from "@/components/recurring-fields";
import { templateSchema, type RecurringTemplate } from "@/lib/recurring-input";
import { templateValues, type RecurringDraft } from "@/lib/recurring-draft";

export function RecurringTemplateEditor({
  initial,
  templateId,
  onSaved,
  onCancel,
}: {
  initial: RecurringDraft;
  templateId?: number;
  onSaved: (template: RecurringTemplate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = templateSchema.safeParse(templateValues(draft));
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/recurring-transactions/templates${templateId ? `/${templateId}` : ""}`,
        {
          method: templateId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.messages?.join(". ") ||
            data.error ||
            "Could not save the template.",
        );
      onSaved(data.template);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save the template.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>
          {templateId ? "Edit template" : "Create template"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <fieldset disabled={busy} className="space-y-5">
            <RecurringFields
              prefix="template"
              value={draft}
              onChange={setDraft}
              template
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                {busy ? "Saving..." : "Save template"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
