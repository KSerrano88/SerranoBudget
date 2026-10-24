"use client";

import { useCallback, useEffect, useState } from "react";
import type { BalanceSheetFilters } from "@/lib/balance-sheet-input";
import type { BalanceSheetData } from "@/lib/types";

interface ReadState {
  key: string;
  data: BalanceSheetData | null;
  error: string | null;
}

export function useBalanceSheet({ days, postStatus }: BalanceSheetFilters) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ReadState | null>(null);
  const key = `${days}:${postStatus}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const params = new URLSearchParams({ days: String(days), postStatus });
        const response = await fetch(`/api/transactions/balance-sheet?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load balance sheet. Please try again.");
        const data: BalanceSheetData = await response.json();
        if (!controller.signal.aborted) setState({ key, data, error: null });
      } catch {
        if (!controller.signal.aborted) {
          setState({ key, data: null, error: "Failed to load balance sheet. Please try again." });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [days, postStatus, key]);

  const current = state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    refresh,
  };
}
