// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/balance-sheet" }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn() } }));
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarProvider } from "@/components/ui/sidebar";

const transaction = {
  ID_TRANSACTIONS: 42, DESCRIPTION: "Test rent", TRANSACTION_DATE: "2026-10-24",
  DEBIT: 123.45, CREDIT: 0, POSTED_FLAG: 1,
};
const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
let mobile = false;
function open() {
  return render(createElement(SidebarProvider, null, createElement(AppSidebar), createElement(MobileNav)));
}
async function preview() {
  if (mobile) fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Last Transaction" }));
  await screen.findByText("Test rent");
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: mobile ? 390 : 1200 });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each([false, true])("Delete Last (mobile=%s)", (isMobile) => {
  beforeEach(() => {
    mobile = isMobile;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: mobile ? 390 : 1200 });
  });
  it("previews the posted record and waits for confirmation", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({ transaction }));
    vi.stubGlobal("fetch", fetch);
    open(); await preview();
    expect(screen.getByText("10/24/2026")).toBeTruthy();
    expect(screen.getByText("$123.45")).toBeTruthy();
    expect(screen.getByText("$0.00")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("blocks repeated taps and refreshes data after success", async () => {
    let finish!: (value: unknown) => void;
    const fetch = vi.fn().mockResolvedValueOnce(reply({ transaction })).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const changed = vi.fn(); window.addEventListener("transactions-changed", changed);
    vi.stubGlobal("fetch", fetch);
    open(); await preview();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const pending = screen.getByRole("button", { name: "Deleting..." }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]).toEqual(["/api/transactions/last", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: 42 }),
    }]);
    await act(async () => finish(reply({ deletedId: 42 })));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Last transaction deleted");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    window.removeEventListener("transactions-changed", changed);
  });
  it.each(["http", "network"])("keeps the preview and retries the same ID after %s failure", async (failure) => {
    const fetch = vi.fn().mockResolvedValueOnce(reply({ transaction }));
    if (failure === "http") fetch.mockResolvedValueOnce(reply({}, 500));
    else fetch.mockRejectedValueOnce(new Error("offline"));
    fetch.mockResolvedValueOnce(reply({ deletedId: 42 }));
    vi.stubGlobal("fetch", fetch);
    open(); await preview();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Test rent")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetch.mock.calls[1][1].body).toBe('{"id":42}');
    expect(fetch.mock.calls[2][1].body).toBe('{"id":42}');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("reports an already deleted record and refreshes", async () => {
    const changed = vi.fn(); window.addEventListener("transactions-changed", changed);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ transaction })).mockResolvedValueOnce(reply({}, 404)));
    open(); await preview();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("This transaction was already deleted"));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    window.removeEventListener("transactions-changed", changed);
  });
  it("keeps the dialog open and permits retry after a preview failure", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(reply({ transaction }));
    vi.stubGlobal("fetch", fetch); open();
    if (mobile) fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Last Transaction" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Test rent");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toEqual({ cache: "no-store" });
  });
  it("reports an empty list without sending a delete", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({ transaction: null }));
    vi.stubGlobal("fetch", fetch); open();
    if (mobile) fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Last Transaction" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("There are no transactions to delete"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
