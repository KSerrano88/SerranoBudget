import { useEffect, useState } from "react";

export interface VisualizationRow {
  TRAN_TYPE: string;
  MONTH: string;
  TOTAL_DEBIT: number;
  TOTAL_CREDIT: number;
}

interface ReadState {
  key: string;
  data: VisualizationRow[];
  error: string | null;
}

export function useVisualizationData(
  startDate: string,
  endDate: string,
  selectedTypes: ReadonlySet<string>,
) {
  const [state, setState] = useState<ReadState | null>(null);
  const params = new URLSearchParams({ startDate, endDate });
  if (selectedTypes.size > 0)
    params.set("tranTypes", [...selectedTypes].join(","));
  const key = startDate && endDate ? params.toString() : "";

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/transactions/visualization?${key}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Failed to load charts. Please try again.");
        const result = await response.json();
        if (!controller.signal.aborted)
          setState({ key, data: result.data || [], error: null });
      } catch {
        if (!controller.signal.aborted) {
          setState({
            key,
            data: [],
            error: "Failed to load charts. Please try again.",
          });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [key]);

  const current = state?.key === key ? state : null;
  return {
    data: current?.data ?? [],
    loading: Boolean(key) && current === null,
    error: current?.error ?? null,
  };
}
