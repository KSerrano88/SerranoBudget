import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { capture, clearAttempts, recordFailedAttempt, isRateLimited } = vi.hoisted(() => ({
  capture: { authorize: undefined as undefined | ((credentials: Record<string, unknown>, request: Request) => Promise<unknown>) },
  clearAttempts: vi.fn(),
  recordFailedAttempt: vi.fn(),
  isRateLimited: vi.fn(() => false),
}));
vi.mock("next-auth", () => ({ default: () => ({}) }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: { authorize: typeof capture.authorize }) => {
  capture.authorize = config.authorize;
  return config;
} }));
vi.mock("@/lib/rate-limit", () => ({ clearAttempts, recordFailedAttempt, isRateLimited }));
import "@/lib/auth";

const authorize = (credentials: Record<string, unknown>) => capture.authorize!(credentials, new Request("http://localhost/login"));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("APP_USERNAME", "test-user"); vi.stubEnv("APP_PASSWORD", "test-password"); });
afterEach(() => vi.unstubAllEnvs());

describe("credential authorization", () => {
  it("accepts matching configured credentials", async () => {
    expect(await authorize({ username: "test-user", password: "test-password" })).toEqual({ id: "1", name: "test-user" });
    expect(clearAttempts).toHaveBeenCalled();
  });
  it.each([undefined, ""])("rejects missing or empty configured credentials: %s", async value => {
    vi.stubEnv("APP_USERNAME", value); vi.stubEnv("APP_PASSWORD", value);
    expect(await authorize(value === undefined ? {} : { username: value, password: value })).toBeNull();
    expect(recordFailedAttempt).toHaveBeenCalled();
    expect(clearAttempts).not.toHaveBeenCalled();
  });
  it.each(["APP_USERNAME", "APP_PASSWORD"])("rejects a missing %s", async key => {
    vi.stubEnv(key, undefined);
    expect(await authorize({ username: "test-user", password: "test-password" })).toBeNull();
  });
  it.each([{}, { username: 1, password: true }, { username: "test-user", password: "wrong" }])("rejects invalid input %j", async credentials => {
    expect(await authorize(credentials)).toBeNull();
  });
  it("continues to deny rate-limited attempts", async () => {
    isRateLimited.mockReturnValueOnce(true);
    expect(await authorize({ username: "test-user", password: "test-password" })).toBeNull();
    expect(clearAttempts).not.toHaveBeenCalled();
  });
});
