"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthData {
  month: number;
  year: number;
  monthName: string;
  debits: Array<{ TRAN_TYPE: string; SUM_DEBIT: number }>;
  credits: Array<{ TRAN_TYPE: string; SUM_CREDIT: number }>;
}

export default function MonthlyTotalsPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions/monthly-totals")
      .then((r) => r.json())
      .then((data) => {
        setMonths(data.months);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">
          Transaction Totals by Month
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction Totals by Month</h1>

      {months.length === 0 ? (
        <p className="text-muted-foreground">No transaction data found.</p>
      ) : (
        months.map((m) => (
          <Card key={`${m.year}-${m.month}`}>
            <CardHeader>
              <CardTitle>
                {m.monthName} {m.year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Debits Column */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Debit Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.debits.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            No debits
                          </TableCell>
                        </TableRow>
                      ) : (
                        m.debits.map((d, i) => (
                          <TableRow
                            key={i}
                            className={
                              d.TRAN_TYPE === "TOTAL DEBITS"
                                ? "font-bold border-t-2"
                                : ""
                            }
                          >
                            <TableCell>{d.TRAN_TYPE}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(d.SUM_DEBIT)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Credits Column */}
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credit Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.credits.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            No credits
                          </TableCell>
                        </TableRow>
                      ) : (
                        m.credits.map((c, i) => (
                          <TableRow
                            key={i}
                            className={
                              c.TRAN_TYPE === "TOTAL CREDITS"
                                ? "font-bold border-t-2"
                                : ""
                            }
                          >
                            <TableCell>{c.TRAN_TYPE}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(c.SUM_CREDIT)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
