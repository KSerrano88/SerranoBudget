"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Search, Save } from "lucide-react";
import { toast } from "sonner";
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

function CustomTooltip({
  active,
  payload,
  label,
  hoveredType,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  hoveredType: string | null;
  suffix: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out zero values
  const items = payload.filter((p) => p.value && p.value > 0);
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {items.map((entry) => {
        const name = entry.name || "";
        const isHovered = hoveredType === `${name}${suffix}`;
        return (
          <div
            key={name}
            className={`flex items-center gap-2 py-0.5 text-sm ${
              isHovered ? "font-bold" : hoveredType ? "opacity-40" : ""
            }`}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span>{name}:</span>
            <span>{formatCurrency(Number(entry.value))}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  percent?: number;
}) {
  const RADIAN = Math.PI / 180;
  const radius = (outerRadius || 0) + 24;
  const x = (cx || 0) + radius * Math.cos(-1 * (midAngle || 0) * RADIAN);
  const y = (cy || 0) + radius * Math.sin(-1 * (midAngle || 0) * RADIAN);
  const textAnchor = x > (cx || 0) ? "start" : "end";
  const label = `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`;

  // Split into words and wrap at ~16 chars per line
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > 16) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={12}
      fill="#374151"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
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
  const [topTypes, setTopTypes] = useState<string[]>([]);
  const [restTypes, setRestTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartView, setChartView] = useState<ChartView>("bar");
  const [typeSearch, setTypeSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const STORAGE_KEY = "viz-default-types";

  useEffect(() => {
    fetch("/api/transactions/types-ranked")
      .then((r) => r.json())
      .then((d) => {
        const top = d.top || [];
        const rest = d.rest || [];
        setTopTypes(top);
        setRestTypes(rest);

        // Load saved defaults from localStorage, or fall back to top 10
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as string[];
            setSelectedTypes(new Set(parsed));
          } catch {
            setSelectedTypes(new Set(top));
          }
        } else {
          setSelectedTypes(new Set(top));
        }
      });
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

  const allTypes = [...topTypes, ...restTypes];

  function selectAll() {
    setSelectedTypes(new Set(allTypes));
  }

  function clearAll() {
    setSelectedTypes(new Set());
  }

  function saveDefaults() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedTypes)));
    toast.success("Default types saved");
  }

  const filteredTop = typeSearch
    ? topTypes.filter((t) => t.toLowerCase().includes(typeSearch.toLowerCase()))
    : topTypes;
  const filteredRest = typeSearch
    ? restTypes.filter((t) => t.toLowerCase().includes(typeSearch.toLowerCase()))
    : restTypes;

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
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Transaction Types
              </Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-72 justify-between bg-white font-normal"
                  >
                    <span className="truncate">
                      {selectedTypes.size === 0
                        ? "All types"
                        : selectedTypes.size === allTypes.length
                          ? "All types"
                          : `${selectedTypes.size} type${selectedTypes.size !== 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      ref={searchInputRef}
                      className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Search types..."
                      value={typeSearch}
                      onChange={(e) => setTypeSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1 border-b px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={selectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearAll}
                    >
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-2">
                      {filteredTop.length > 0 && (
                        <>
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Most Common
                          </p>
                          {filteredTop.map((type) => (
                            <label
                              key={type}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                            >
                              <Checkbox
                                checked={selectedTypes.has(type)}
                                onCheckedChange={() => toggleType(type)}
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </>
                      )}
                      {filteredTop.length > 0 && filteredRest.length > 0 && (
                        <Separator className="my-2" />
                      )}
                      {filteredRest.length > 0 && (
                        <>
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Other
                          </p>
                          {filteredRest.map((type) => (
                            <label
                              key={type}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                            >
                              <Checkbox
                                checked={selectedTypes.has(type)}
                                onCheckedChange={() => toggleType(type)}
                              />
                              <span>{type}</span>
                            </label>
                          ))}
                        </>
                      )}
                      {filteredTop.length === 0 && filteredRest.length === 0 && (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No types found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={saveDefaults}
              disabled={selectedTypes.size === 0}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save as Default
            </Button>
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
                          content={
                            <CustomTooltip
                              hoveredType={hoveredType}
                              suffix="_debit"
                            />
                          }
                        />
                        <Legend />
                        {types.map((type) => (
                          <Bar
                            key={type}
                            dataKey={`${type}_debit`}
                            name={type}
                            fill={typeColorMap.get(type)}
                            stackId="debits"
                            onMouseEnter={() =>
                              setHoveredType(`${type}_debit`)
                            }
                            onMouseLeave={() => setHoveredType(null)}
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
                          content={
                            <CustomTooltip
                              hoveredType={hoveredType}
                              suffix="_credit"
                            />
                          }
                        />
                        <Legend />
                        {types.map((type) => (
                          <Bar
                            key={type}
                            dataKey={`${type}_credit`}
                            name={type}
                            fill={typeColorMap.get(type)}
                            stackId="credits"
                            onMouseEnter={() =>
                              setHoveredType(`${type}_credit`)
                            }
                            onMouseLeave={() => setHoveredType(null)}
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
                          content={
                            <CustomTooltip
                              hoveredType={hoveredType}
                              suffix="_debit"
                            />
                          }
                        />
                        <Legend />
                        {types.map((type) => (
                          <Line
                            key={type}
                            type="monotone"
                            dataKey={`${type}_debit`}
                            name={type}
                            stroke={typeColorMap.get(type)}
                            strokeWidth={hoveredType === `${type}_debit` ? 4 : 2}
                            strokeOpacity={
                              hoveredType && hoveredType !== `${type}_debit`
                                ? 0.2
                                : 1
                            }
                            dot={{ r: 3 }}
                            activeDot={{
                              onMouseEnter: () =>
                                setHoveredType(`${type}_debit`),
                              onMouseLeave: () => setHoveredType(null),
                            }}
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
                          content={
                            <CustomTooltip
                              hoveredType={hoveredType}
                              suffix="_credit"
                            />
                          }
                        />
                        <Legend />
                        {types.map((type) => (
                          <Line
                            key={type}
                            type="monotone"
                            dataKey={`${type}_credit`}
                            name={type}
                            stroke={typeColorMap.get(type)}
                            strokeWidth={hoveredType === `${type}_credit` ? 4 : 2}
                            strokeOpacity={
                              hoveredType && hoveredType !== `${type}_credit`
                                ? 0.2
                                : 1
                            }
                            dot={{ r: 3 }}
                            activeDot={{
                              onMouseEnter: () =>
                                setHoveredType(`${type}_credit`),
                              onMouseLeave: () => setHoveredType(null),
                            }}
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
                          label={PieLabel}
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
                          label={PieLabel}
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
