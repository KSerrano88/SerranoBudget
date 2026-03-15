"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypeSelector } from "@/components/type-selector";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

type AmountType = "debit" | "credit";

export default function AddTransactionPage() {
  const router = useRouter();
  const [topTypes, setTopTypes] = useState<string[]>([]);
  const [restTypes, setRestTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [posted, setPosted] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkNmbr, setCheckNmbr] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [multiPartTotal, setMultiPartTotal] = useState("");
  const [selectedType, setSelectedType] = useState("__none__");
  const [newType, setNewType] = useState("");
  const [amountType, setAmountType] = useState<AmountType>("debit");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetch("/api/transactions/types-ranked")
      .then((r) => r.json())
      .then((data) => {
        setTopTypes(data.top);
        setRestTypes(data.rest);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let tranType = "";
    if (newType.trim()) {
      tranType = newType.trim();
    } else if (selectedType && selectedType !== "__none__") {
      tranType = selectedType;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    const numAmount = Number(amount) || 0;

    setLoading(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TRANSACTION_DATE: date,
        CHECK_NMBR: checkNmbr,
        DESCRIPTION: description,
        NOTES: notes,
        MULTI_PART_TRAN_TOTAL: Number(multiPartTotal) || 0,
        POSTED_FLAG: posted ? 1 : 0,
        TRAN_TYPE: tranType,
        DEBIT: amountType === "debit" ? numAmount : 0,
        CREDIT: amountType === "credit" ? numAmount : 0,
      }),
    });

    setLoading(false);

    if (res.ok) {
      toast.success("Transaction added");
      router.push("/balance-sheet");
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Failed to add transaction");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add a Transaction</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Posted */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="posted"
                checked={posted}
                onCheckedChange={(c) => setPosted(c === true)}
              />
              <Label htmlFor="posted">Posted</Label>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Transaction Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="max-w-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.toUpperCase())}
                maxLength={100}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={200}
                rows={2}
              />
            </div>

            {/* Transaction Type */}
            <TypeSelector
              topTypes={topTypes}
              restTypes={restTypes}
              selectedType={selectedType}
              newType={newType}
              onSelectType={setSelectedType}
              onNewTypeChange={setNewType}
            />

            {/* Amount: Debit or Credit toggle + single amount field */}
            <div className="space-y-3">
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={amountType === "debit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmountType("debit")}
                >
                  Debit
                </Button>
                <Button
                  type="button"
                  variant={amountType === "credit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmountType("credit")}
                >
                  Credit
                </Button>
              </div>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                placeholder={amountType === "debit" ? "Debit amount" : "Credit amount"}
                className="max-w-xs"
              />
            </div>

            {/* Advanced: Check Number, Multi-Part Total */}
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showAdvanced ? "rotate-180" : ""
                  }`}
                />
                Additional fields
              </button>
              {showAdvanced && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkNmbr">Check Number</Label>
                    <Input
                      id="checkNmbr"
                      value={checkNmbr}
                      onChange={(e) => setCheckNmbr(e.target.value)}
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multiPart">Multi-Part Total</Label>
                    <Input
                      id="multiPart"
                      type="number"
                      value={multiPartTotal}
                      onChange={(e) => setMultiPartTotal(e.target.value)}
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding..." : "Add Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
