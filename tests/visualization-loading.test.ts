// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisualizationData } from "@/hooks/use-visualization-data";

const filters = {
  startDate: "2026-01-01",
  endDate: "2026-10-24",
  types: new Set(["Food"]),
};
const rows = [
  { TRAN_TYPE: "Food", MONTH: "2026-10", TOTAL_DEBIT: 100, TOTAL_CREDIT: 0 },
];
const response = (data = rows) =>
  ({ ok: true, json: async () => ({ data }) }) as Response;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function useData(props = filters) {
  return useVisualizationData(props.startDate, props.endDate, props.types);
}

describe("visualization loading", () => {
  it("loads chart data for the selected dates and categories", async () => {
    const fetch = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useData());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(rows);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/transactions/visualization?startDate=2026-01-01&endDate=2026-10-24&tranTypes=Food",
      { signal: expect.any(AbortSignal), cache: "no-store" },
    );
  });

  it.each(["network", "http", "json"])(
    "ends loading and reports a %s failure",
    async (failure) => {
      const fetch = vi.fn();
      if (failure === "network") fetch.mockRejectedValue(new Error("offline"));
      if (failure === "http") fetch.mockResolvedValue({ ok: false });
      if (failure === "json")
        fetch.mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error("invalid JSON");
          },
        });
      vi.stubGlobal("fetch", fetch);
      const { result } = renderHook(() => useData());
      await waitFor(() =>
        expect(result.current.error).toContain("Failed to load charts"),
      );
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([]);
    },
  );

  it("ignores stale responses after filters change", async () => {
    const older = deferred<Response>();
    const latest = deferred<Response>();
    const fetch = vi
      .fn()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(latest.promise);
    vi.stubGlobal("fetch", fetch);
    const { result, rerender } = renderHook(useData, { initialProps: filters });
    rerender({ ...filters, types: new Set(["Housing"]) });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () =>
      latest.resolve(response([{ ...rows[0], TRAN_TYPE: "Housing" }])),
    );
    await act(async () => older.resolve(response()));
    expect(result.current.data[0].TRAN_TYPE).toBe("Housing");
    expect(result.current.loading).toBe(false);
  });

  it("does not fetch without both dates and aborts when the page unmounts", () => {
    const fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetch);
    const { result, rerender, unmount } = renderHook(useData, {
      initialProps: { ...filters, startDate: "" },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    rerender(filters);
    unmount();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});


it("refreshes after deletion while keeping the current filters", async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useData());
  await waitFor(() => expect(result.current.loading).toBe(false));
  const initialUrl = fetch.mock.calls[0][0];
  act(() => window.dispatchEvent(new Event("transactions-changed")));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fetch.mock.calls[1][0]).toBe(initialUrl);
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
});
