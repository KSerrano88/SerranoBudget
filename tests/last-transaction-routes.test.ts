import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/queries", () => ({ getLastTransaction: vi.fn(), deleteLastTransaction: vi.fn() }));
import { auth } from "@/lib/auth";
import { getLastTransaction, deleteLastTransaction } from "@/lib/queries";
import { GET, DELETE } from "@/app/api/transactions/last/route";

const send = (body: unknown) => DELETE(new NextRequest("http://localhost/api/transactions/last", {
  method: "DELETE", body: JSON.stringify(body),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { name: "test" } } as never);
});

describe("last transaction routes", () => {
  it("requires authentication for preview and deletion", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await GET()).status).toBe(401);
    expect((await send({ id: 42 })).status).toBe(401);
    expect(getLastTransaction).not.toHaveBeenCalled();
    expect(deleteLastTransaction).not.toHaveBeenCalled();
  });
  it("returns the preview and an explicit empty result", async () => {
    vi.mocked(getLastTransaction).mockResolvedValueOnce({ ID_TRANSACTIONS: 42 } as never).mockResolvedValueOnce(null);
    expect(await (await GET()).json()).toEqual({ transaction: { ID_TRANSACTIONS: 42 } });
    expect(await (await GET()).json()).toEqual({ transaction: null });
  });
  it.each([null, {}, { id: 0 }, { id: -1 }, { id: 1.5 }, { id: "42" }, { id: 2147483648 }])("rejects an invalid confirmed ID: %j", async (body) => {
    expect((await send(body)).status).toBe(400);
    expect(deleteLastTransaction).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const response = await DELETE(new NextRequest("http://localhost/api/transactions/last", { method: "DELETE", body: "{" }));
    expect(response.status).toBe(400);
    expect(deleteLastTransaction).not.toHaveBeenCalled();
  });
  it("deletes the confirmed ID without selecting another row", async () => {
    vi.mocked(deleteLastTransaction).mockResolvedValue(42);
    expect(await (await send({ id: 42 })).json()).toEqual({ deletedId: 42 });
    expect(deleteLastTransaction).toHaveBeenCalledExactlyOnceWith(42);
    expect(getLastTransaction).not.toHaveBeenCalled();
  });
  it("reports a missing record without deleting a replacement", async () => {
    vi.mocked(deleteLastTransaction).mockResolvedValue(null);
    expect((await send({ id: 42 })).status).toBe(404);
    expect(deleteLastTransaction).toHaveBeenCalledExactlyOnceWith(42);
    expect(getLastTransaction).not.toHaveBeenCalled();
  });
  it("returns a server error when persistence fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getLastTransaction).mockRejectedValue(new Error("offline"));
    vi.mocked(deleteLastTransaction).mockRejectedValue(new Error("offline"));
    expect((await GET()).status).toBe(500);
    expect((await send({ id: 42 })).status).toBe(500);
    log.mockRestore();
  });
});
