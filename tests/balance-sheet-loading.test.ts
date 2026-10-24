// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBalanceSheet } from "@/hooks/use-balance-sheet";
import type { BalanceSheetFilters } from "@/lib/balance-sheet-input";

const filters: BalanceSheetFilters = { days: 30, postStatus: "all" };
const resultData = { transactions: [], summary: {} };
const response = (data = resultData) => ({ ok: true, json: async () => data } as Response);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("balance sheet loading", () => {
  it("loads rows and summary in one request", async () => {
    const fetch = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useBalanceSheet(filters));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(resultData);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "/api/transactions/balance-sheet?days=30&postStatus=all",
      { signal: expect.any(AbortSignal), cache: "no-store" }
    );
  });

  it.each(["network", "http", "json"])("shows an error and permits retry after a %s failure", async (failure) => {
    const fetch = vi.fn();
    if (failure === "network") fetch.mockRejectedValueOnce(new Error("offline"));
    if (failure === "http") fetch.mockResolvedValueOnce({ ok: false });
    if (failure === "json") fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("invalid JSON"); } });
    fetch.mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useBalanceSheet(filters));
    await waitFor(() => expect(result.current.error).toContain("Failed to load"));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.data).toEqual(resultData));
    expect(result.current.error).toBeNull();
  });

  it("ignores an older response even when it arrives after the new response", async () => {
    const older = deferred<Response>();
    const latest = deferred<Response>();
    const fetch = vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
    vi.stubGlobal("fetch", fetch);
    const { result, rerender } = renderHook((props) => useBalanceSheet(props), { initialProps: filters });
    rerender({ days: 7, postStatus: "posted" });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => latest.resolve(response()));
    await act(async () => older.resolve(response({ transactions: [], summary: { old: true } })));
    expect(result.current.data).toEqual(resultData);
    expect(result.current.error).toBeNull();
  });

  it("ignores an older failure while the current request is loading", async () => {
    const older = deferred<Response>();
    const latest = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise));
    const { result, rerender } = renderHook((props) => useBalanceSheet(props), { initialProps: filters });
    rerender({ days: 7, postStatus: "unposted" });
    await act(async () => older.reject(new Error("old failure")));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => latest.resolve(response()));
    expect(result.current.data).toEqual(resultData);
  });

  it("aborts a pending request when the page unmounts", () => {
    const fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetch);
    const { unmount } = renderHook(() => useBalanceSheet(filters));
    unmount();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
