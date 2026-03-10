import { describe, it, expect, beforeEach, vi } from "vitest";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";

beforeEach(() => {
  // Clear state between tests by clearing a known key
  clearAttempts("test-ip");
  clearAttempts("other-ip");
});

describe("rate limiting", () => {
  it("allows first attempt", () => {
    expect(isRateLimited("test-ip")).toBe(false);
  });

  it("allows up to 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("test-ip")).toBe(false);
      recordFailedAttempt("test-ip");
    }
  });

  it("blocks after 5 failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-ip");
    }
    expect(isRateLimited("test-ip")).toBe(true);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-ip");
    }
    expect(isRateLimited("test-ip")).toBe(true);
    expect(isRateLimited("other-ip")).toBe(false);
  });

  it("clears attempts on successful login", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-ip");
    }
    expect(isRateLimited("test-ip")).toBe(true);

    clearAttempts("test-ip");
    expect(isRateLimited("test-ip")).toBe(false);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-ip");
    }
    expect(isRateLimited("test-ip")).toBe(true);

    // Advance past 15-minute window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isRateLimited("test-ip")).toBe(false);

    vi.useRealTimers();
  });
});
