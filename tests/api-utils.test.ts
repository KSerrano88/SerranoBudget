import { describe, it, expect, vi } from "vitest";

// Mock next-auth and next/server to avoid ESM resolution errors
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { isValidDate, isValidDays, isCalendarDate } from "@/lib/api-utils";

describe("isValidDate", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDate("2024-01-15")).toBe(true);
    expect(isValidDate("2024-12-31")).toBe(true);
    expect(isValidDate("2000-01-01")).toBe(true);
  });

  it("rejects non-date strings", () => {
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate("abc")).toBe(false);
  });

  it("rejects wrong formats", () => {
    expect(isValidDate("01-15-2024")).toBe(false);
    expect(isValidDate("2024/01/15")).toBe(false);
    expect(isValidDate("20240115")).toBe(false);
    expect(isValidDate("2024-1-5")).toBe(false);
  });

  it("rejects dates with extra content", () => {
    expect(isValidDate("2024-01-15T00:00:00")).toBe(false);
    expect(isValidDate("2024-01-15 extra")).toBe(false);
  });
});

describe("isCalendarDate", () => {
  it("accepts valid calendar dates", () => {
    expect(isCalendarDate("2024-01-01")).toBe(true);
    expect(isCalendarDate("2024-02-29")).toBe(true); // 2024 is a leap year
    expect(isCalendarDate("2024-12-31")).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(isCalendarDate("2024-02-30")).toBe(false);
    expect(isCalendarDate("2024-04-31")).toBe(false);
    expect(isCalendarDate("2024-13-01")).toBe(false);
    expect(isCalendarDate("2024-00-01")).toBe(false);
    expect(isCalendarDate("2023-02-29")).toBe(false); // 2023 is not a leap year
  });

  it("rejects non-date strings", () => {
    expect(isCalendarDate("not-a-date")).toBe(false);
    expect(isCalendarDate("")).toBe(false);
  });

  it("rejects wrong formats", () => {
    expect(isCalendarDate("01-15-2024")).toBe(false);
    expect(isCalendarDate("2024/01/15")).toBe(false);
  });
});

describe("isValidDays", () => {
  it("accepts valid day ranges", () => {
    expect(isValidDays(0)).toBe(true);
    expect(isValidDays(1)).toBe(true);
    expect(isValidDays(30)).toBe(true);
    expect(isValidDays(365)).toBe(true);
    expect(isValidDays(3650)).toBe(true);
  });

  it("rejects negative numbers", () => {
    expect(isValidDays(-1)).toBe(false);
    expect(isValidDays(-100)).toBe(false);
  });

  it("rejects numbers above 3650", () => {
    expect(isValidDays(3651)).toBe(false);
    expect(isValidDays(999999)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isValidDays(NaN)).toBe(false);
    expect(isValidDays(Infinity)).toBe(false);
    expect(isValidDays(-Infinity)).toBe(false);
  });
});
