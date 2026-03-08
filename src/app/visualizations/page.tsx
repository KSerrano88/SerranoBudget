"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataRow {
  TRAN_TYPE: string;
  MONTH: string;
  TOTAL_DEBIT: number;
  TOTAL_CREDIT: number;
}

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#65a30d", "#ea580c", "#6366f1",
  "#0d9488", "#c026d3", "#ca8a04", "#e11d48", "#4f46e5",
];

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type ChartView = "bar" | "line" | "pie";

export default function VisualizationsPage() {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const [startDate, setStartDate] = useState(
    oneYearAgo.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartView, setChartView] = useState<ChartView>("bar");

  useEffect(() => {
    fetch("/api/transactions/types")
      .then((r) => r.json())
      .then((d) => setAllTypes(d.types || []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (selectedTypes.size > 0) {
      params.set("tranTypes", Array.from(selectedTypes).join(","));
    }
    const res = await fetch(`/api/transactions/visualization?${params}`);
    const json = await res.json();
    setData(json.data || []);
    setLoading(false);
  }, [startDate, endDate, selectedTypes]);

  useEffect(() => {
    if (startDate && endDate) fetchData();
  }, [fetchData, startDate, endDate]);

  function toggleType(type: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function selectAll() {
    setSelectedTypes(new Set(allTypes));
  }

  function clearAll() {
    setSelectedTypes(new Set());
  }

  // Build monthly bar/line data: each month has a key per type for debits and credits
  const months = [...new Set(data.map((d) => d.MONTH))].sort();
  const types = [...new Set(data.map((d) => d.TRAN_TYPE))].sort();
  const typeColorMap = new Map(types.map((t, i) => [t, COLORS[i % COLORS.length]]));

  const monthlyData = months.map((month) => {
    const row: Record<string, string | number> = { month: formatMonth(month) };
    for (const type of types) {
      const match = data.find((d) => d.MONTH === month && d.TRAN_TYPE === type);
      row[`${type}_debit`] = match ? Number(match.TOTAL_DEBIT) : 0;
      row[`${type}_credit`] = match ? Number(match.TOTAL_CREDIT) : 0;
    }
    return row;
  });

  // Build pie data: aggregate totals per type
  const pieData = types.map((type) => {
    const typeRows = data.filter((d) => d.TRAN_TYPE === type);
    const totalDebit = typeRows.reduce((s, r) => s + Number(r.TOTAL_DEBIT), 0);
    const totalCredit = typeRows.reduce(
      (s, r) => s + Number(r.TOTAL_CREDIT),
      0
    );
    return { name: type, debit: totalDebit, credit: totalCredit };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visualizations</h1>

      <Card>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="space-y-1">
              <Label htmlFor="viz-start" className="text-xs text-muted-foreground">
                Start Date
              </Label>
              <Input
                id="viz-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40 bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="viz-end" className="text-xs text-muted-foreground">
                End Date
              </Label>
              <Input
                id="viz-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40 bg-white"
              />
            </div>
          </div>

          {/* Transaction type selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold">Transaction Types</Label>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {allTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTypes.has(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Chart view toggle */}
          <div className="flex gap-2">
            <Button
              variant={chartView === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("bar")}
            >
              Bar Chart
            </Button>
            <Button
              variant={chartView === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("line")}
            >
              Trend Lines
            </Button>
            <Button
              variant={chartView === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartView("pie")}
            >
              Pie Chart
            </Button>
          </div>

          {/* Charts */}
          {loading ? (
            <p className="text-muted-foreground">Loading data...</p>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground">
              No data found for the selected filters.
            </p>
          ) : (
            <div className="space-y-8">
              {chartView === "bar" && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">
                      Debits by Type
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        {types.map((type) => (
                          <Bar
                            key={type}
                            dataKey={`${type}_debit`}
                            name={type}
                            fill={typeColorMap.get(type)}
                            stackId="debits"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">
                      Credits by Type
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        {types.map((type) => (
                          <Bar
                            key={type}
                            dataKey={`${type}_credit`}
                            name={type}
                            fill={typeColorMap.get(type)}
                            stackId="credits"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {chartView === "line" && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">
                      Debit Trends
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        {types.map((type) => (
                          <Line
                            key={type}
                            type="monotone"
                            dataKey={`${type}_debit`}
                            name={type}
                            stroke={typeColorMap.get(type)}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">
                      Credit Trends
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        {types.map((type) => (
                          <Line
                            key={type}
                            type="monotone"
                            dataKey={`${type}_credit`}
                            name={type}
                            stroke={typeColorMap.get(type)}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {chartView === "pie" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-center">
                      Total Debits by Type
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={pieData.filter((d) => d.debit > 0)}
                          dataKey="debit"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={140}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`
                          }
                          labelLine
                        >
                          {pieData
                            .filter((d) => d.debit > 0)
                            .map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={typeColorMap.get(entry.name)}
                              />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-center">
                      Total Credits by Type
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={pieData.filter((d) => d.credit > 0)}
                          dataKey="credit"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={140}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`
                          }
                          labelLine
                        >
                          {pieData
                            .filter((d) => d.credit > 0)
                            .map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={typeColorMap.get(entry.name)}
                              />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
