// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { push, replace, success } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  success: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success } }));
import Page from "@/app/recurring-transactions/page";

const template = {
  ID_TEMPLATE: 1,
  DESCRIPTION: "RENT",
  TRAN_TYPE: "Housing",
  DIRECTION: "debit",
  AMOUNT: null,
  DAY_OF_MONTH: 31,
  NOTES: "Saved note",
  POSTED_FLAG: 0,
};
function response(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => data } as Response;
}
let add = vi.fn<(options?: RequestInit) => Promise<Response>>();
let duplicates: { templateId: number; month: string }[];
let fetchMock =
  vi.fn<(url: string, options?: RequestInit) => Promise<Response>>();
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/recurring-transactions");
  duplicates = [];
  add = vi.fn().mockResolvedValue(response({ count: 1, ids: [42] }, 201));
  fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/recurring-transactions/templates")
      return response({ templates: [template] });
    if (url === "/api/transactions/types")
      return response({ types: ["Housing"] });
    if (url === "/api/recurring-transactions/check")
      return response({ duplicates });
    if (url === "/api/recurring-transactions") return add(options);
    if (options?.method === "DELETE") return response({ success: true });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function review() {
  render(createElement(Page));
  fireEvent.click(await screen.findByLabelText("Select all templates"));
  fireEvent.change(screen.getByLabelText("Month"), {
    target: { value: "2026-02" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add Selected Transactions (1)" }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Checking for duplicates...")).toBeNull(),
  );
}

describe("saving selected transactions as templates", () => {
  it("reviews each selected transaction separately and resets the form between saves", async () => {
    window.history.replaceState({}, "", "/recurring-transactions?from=42,43");
    const baseFetch = fetchMock.getMockImplementation()!;
    let nextId = 10;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.startsWith("/api/transactions/bulk?ids="))
        return response({
          transactions: [
            {
              ID_TRANSACTIONS: 42,
              DESCRIPTION: "FIRST BILL",
              TRANSACTION_DATE: "2026-10-10",
              TRAN_TYPE: "Housing",
              DEBIT: 100,
              CREDIT: 0,
              NOTES: "First note",
            },
            {
              ID_TRANSACTIONS: 43,
              DESCRIPTION: "SECOND BILL",
              TRANSACTION_DATE: "2026-10-15",
              TRAN_TYPE: "Utilities",
              DEBIT: 200,
              CREDIT: 0,
              NOTES: "Second note",
            },
          ],
        });
      if (
        url === "/api/recurring-transactions/templates" &&
        options?.method === "POST"
      ) {
        return response(
          {
            template: {
              ...JSON.parse(options.body as string),
              ID_TEMPLATE: nextId++,
            },
          },
          201,
        );
      }
      return baseFetch(url, options);
    });
    render(createElement(Page));
    await screen.findByText("Create template (1 of 2)");
    expect(
      (screen.getByLabelText("Description (required)") as HTMLInputElement)
        .value,
    ).toBe("FIRST BILL");
    fireEvent.click(
      screen.getByRole("button", { name: "Save template and continue" }),
    );
    await screen.findByText("Create template (2 of 2)");
    expect(
      (screen.getByLabelText("Description (required)") as HTMLInputElement)
        .value,
    ).toBe("SECOND BILL");
    expect(
      (screen.getByLabelText("Default amount (optional)") as HTMLInputElement)
        .value,
    ).toBe("200");
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));
    await screen.findByRole("button", { name: "Edit SECOND BILL" });
    expect(
      screen.getByRole("button", { name: "Edit FIRST BILL" }),
    ).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/recurring-transactions");
  });
});

describe("recurring transaction review", () => {
  it("requires variable amounts and applies month-end dates and unposted defaults", async () => {
    await review();
    expect(
      (screen.getByLabelText("Transaction date (required)") as HTMLInputElement)
        .value,
    ).toBe("2026-02-28");
    expect(
      (screen.getByLabelText("Amount (required)") as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText("Posted") as HTMLInputElement).checked).toBe(
      false,
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Add 1 transaction" })
        .closest("form")!,
    );
    expect(add).not.toHaveBeenCalled();
  });
  it("keeps review edits on failure, then retries with the same request ID", async () => {
    add.mockRejectedValueOnce(new Error("Connection failed"));
    await review();
    fireEvent.change(screen.getByLabelText("Amount (required)"), {
      target: { value: "1100.50" },
    });
    fireEvent.change(screen.getByLabelText("Description (required)"), {
      target: { value: "RENT CHANGED" },
    });
    fireEvent.click(screen.getByLabelText("Posted"));
    fireEvent.click(screen.getByRole("button", { name: "Add 1 transaction" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Connection failed",
    );
    expect(
      (screen.getByLabelText("Amount (required)") as HTMLInputElement).value,
    ).toBe("1100.50");
    fireEvent.click(screen.getByRole("button", { name: "Add 1 transaction" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        expect.stringContaining("/balance-sheet?added=1&newIds=42"),
      ),
    );
    const first = JSON.parse(add.mock.calls[0][0]!.body as string);
    const second = JSON.parse(add.mock.calls[1][0]!.body as string);
    expect(first.requestId).toBe(second.requestId);
    expect(second.transactions[0]).toMatchObject({
      DESCRIPTION: "RENT CHANGED",
      AMOUNT: 1100.5,
      POSTED_FLAG: 1,
    });
    expect(template.DESCRIPTION).toBe("RENT");
  });
  it("requires acknowledgement before adding a duplicate", async () => {
    duplicates = [{ templateId: 1, month: "2026-02" }];
    await review();
    fireEvent.change(screen.getByLabelText("Amount (required)"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add 1 transaction" }));
    expect(add).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByLabelText(
        "I reviewed the warning. Add these transactions again.",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add 1 transaction" }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(add.mock.calls[0][0]!.body as string).allowDuplicates,
    ).toBe(true);
  });
  it("does not delete until the user confirms", async () => {
    render(createElement(Page));
    fireEvent.click(await screen.findByRole("button", { name: "Delete RENT" }));
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "DELETE"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Delete RENT" })).toBeNull(),
    );
    expect(success).toHaveBeenCalledWith(
      "Template deleted. Existing transactions are unchanged.",
    );
  });
});
