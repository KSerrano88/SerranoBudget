// @vitest-environment jsdom
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Transaction } from "@/lib/types";

const { router, useBalanceSheet } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  useBalanceSheet: vi.fn(),
}));
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => params,
}));
vi.mock("@/hooks/use-balance-sheet", () => ({ useBalanceSheet }));
import Page from "@/app/balance-sheet/page";

const transaction = (id: number, description: string): Transaction => ({
  ID_TRANSACTIONS: id,
  DESCRIPTION: description,
  TRANSACTION_DATE: "2026-10-24",
  CHECK_NMBR: "",
  NOTES: "",
  MULTI_PART_TRAN_TOTAL: 0,
  POSTED_FLAG: 0,
  TRAN_TYPE: "Housing",
  DEBIT: 100,
  CREDIT: 0,
});
function open() {
  return render(createElement(TooltipProvider, null, createElement(Page)));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  params = new URLSearchParams("added=1&newIds=42&days=86");
  useBalanceSheet.mockReturnValue({
    data: {
      transactions: [transaction(42, "NEW RENT"), transaction(5, "OLD RENT")],
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Balance Sheet addition feedback", () => {
  it("shows the count and highlights only the new rows, then clears both after ten seconds", () => {
    open();
    expect(screen.getByRole("status").textContent).toBe(
      "1 new transaction added.",
    );
    expect(
      screen.getByText("NEW RENT").closest("tr")?.getAttribute("data-new"),
    ).toBe("true");
    expect(
      screen.getByText("OLD RENT").closest("tr")?.hasAttribute("data-new"),
    ).toBe(false);
    expect(useBalanceSheet).toHaveBeenCalledWith({
      days: 86,
      postStatus: "all",
    });
    expect(router.replace).toHaveBeenCalledWith("/balance-sheet", {
      scroll: false,
    });
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("New", { exact: true })).toBeNull();
    expect(
      screen.getByText("NEW RENT").closest("tr")?.hasAttribute("data-new"),
    ).toBe(false);
  });
  it("lets the user dismiss the message and highlights immediately", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("New", { exact: true })).toBeNull();
  });
  it("starts the ten-second interval only after the rows load", () => {
    useBalanceSheet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    const view = open();
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByRole("status")).toBeTruthy();
    useBalanceSheet.mockReturnValue({
      data: { transactions: [transaction(42, "NEW RENT")] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    view.rerender(createElement(TooltipProvider, null, createElement(Page)));
    expect(screen.getByText("New", { exact: true })).toBeTruthy();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("uses the selected rows for the toolbar action and has no row template links", () => {
    open();
    const button = screen.getByRole("button", { name: "Save as Template" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: /Save.*template/i })).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all transactions" }),
    );
    fireEvent.click(button);
    expect(router.push).toHaveBeenCalledWith(
      "/recurring-transactions?from=42,5",
    );
    const actionNames = screen
      .getAllByRole("button")
      .map((button) => button.textContent);
    const edit = actionNames.indexOf("Edit Selected");
    expect(actionNames.slice(edit, edit + 3)).toEqual([
      "Edit Selected",
      "Save as Template",
      "Delete Selected",
    ]);
  });
});
