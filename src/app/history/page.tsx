"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { TransactionTable } from "@/components/transaction-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTransactionRevision } from "@/hooks/use-transaction-revision";

interface HistoryResult {
  transactions: Transaction[];
  summary: {
    SUM_DEBIT: number;
    SUM_CREDIT: number;
    DIFFERENCE: number;
  };
}

export default function HistoryPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tranType, setTranType] = useState("__none__");
  const [tranTypeContains, setTranTypeContains] = useState("");
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revision = useTransactionRevision();
  const [submission, setSubmission] = useState(0);

  useEffect(() => {
    fetch("/api/transactions/types")
      .then((r) => r.json())
      .then((data) => setTypes(data.types));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (tranType && tranType !== "__none__") {
      params.set("tranType", tranType);
    }
    if (tranTypeContains.trim()) {
      params.set("tranTypeContains", tranTypeContains.trim());
    }

    setSubmittedQuery(params.toString());
    setSubmission((value) => value + 1);
  }

  useEffect(() => {
    if (submittedQuery === null) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/transactions/history?${submittedQuery}`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error("Read failed");
        const data = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) {
          setResult(null);
          setError("Failed to load transaction history. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [submittedQuery, revision, submission]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={tranType} onValueChange={setTranType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All Types</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contains">Type Contains</Label>
                <Input
                  id="contains"
                  value={tranTypeContains}
                  onChange={(e) => setTranTypeContains(e.target.value)}
                  placeholder="Search within type..."
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Display Transactions"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-xl font-semibold text-red-600">
                  {formatCurrency(result.summary?.SUM_DEBIT)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(result.summary?.SUM_CREDIT)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p
                  className={`text-xl font-semibold ${
                    (result.summary?.DIFFERENCE || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(result.summary?.DIFFERENCE)}
                </p>
              </CardContent>
            </Card>
          </div>

          <TransactionTable transactions={result.transactions} showTemplateLinks />
        </div>
      )}
    </div>
  );
}
