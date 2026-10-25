// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/components/transaction-table", () => ({ TransactionTable: () => null }));
import History from "@/app/history/page";
import MonthlyTotals from "@/app/monthly-totals/page";
const reply = (data: unknown) => ({ ok: true, json: async () => data });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("refreshes history with the submitted filters and preserves unsaved filter changes", async () => {
  const fetch = vi.fn().mockImplementation(async (url: string) => url.includes("/types")
    ? reply({ types: [] }) : reply({ transactions: [], summary: {} }));
  vi.stubGlobal("fetch", fetch);
  render(createElement(History));
  fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-10-24" } });
  fireEvent.submit(screen.getByLabelText("Start Date").closest("form")!);
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.includes("history"))).toHaveLength(1));
  fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-02-01" } });
  act(() => window.dispatchEvent(new Event("transactions-changed")));
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.includes("history"))).toHaveLength(2));
  const calls = fetch.mock.calls.filter(([url]) => url.includes("history"));
  expect(calls[1][0]).toBe(calls[0][0]);
  expect(calls[1][0]).toContain("startDate=2026-01-01&endDate=2026-10-24");
  expect((screen.getByLabelText("Start Date") as HTMLInputElement).value).toBe("2026-02-01");
});

it("refreshes monthly totals after deletion", async () => {
  const fetch = vi.fn().mockResolvedValue(reply({ months: [] }));
  vi.stubGlobal("fetch", fetch);
  render(createElement(MonthlyTotals));
  await screen.findByText("No transaction data found.");
  act(() => window.dispatchEvent(new Event("transactions-changed")));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(fetch.mock.calls[1][0]).toBe("/api/transactions/monthly-totals");
});
