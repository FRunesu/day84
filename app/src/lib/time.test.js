import { describe, it, expect } from "vitest";
import {
  getElapsedPercent,
  dayProgress,
  weekProgress,
  cycleProgress,
  yearProgress,
  dateKey,
  cycleDayKeys,
  startOfWeek,
  cycleDaysRemaining,
  TIME_CONSTANTS,
} from "./time.js";

describe("getElapsedPercent", () => {
  const start = new Date("2026-01-01T00:00:00");
  const end = new Date("2026-01-11T00:00:00"); // 10-day window

  it("returns 0 before the window starts", () => {
    expect(getElapsedPercent(start, end, new Date("2025-12-31T00:00:00"))).toBe(0);
  });

  it("returns 0 exactly at the start", () => {
    expect(getElapsedPercent(start, end, start)).toBe(0);
  });

  it("returns 50 at the midpoint", () => {
    expect(getElapsedPercent(start, end, new Date("2026-01-06T00:00:00"))).toBe(50);
  });

  it("returns 100 exactly at the end", () => {
    expect(getElapsedPercent(start, end, end)).toBe(100);
  });

  it("returns 100 after the window ends (clamped, never overshoots)", () => {
    expect(getElapsedPercent(start, end, new Date("2026-02-01T00:00:00"))).toBe(100);
  });

  it("guards against a malformed (end <= start) range instead of dividing by zero", () => {
    expect(getElapsedPercent(end, start, new Date())).toBe(0);
  });
});

describe("dayProgress", () => {
  it("is ~50% at noon", () => {
    const noon = new Date("2026-06-15T12:00:00");
    expect(dayProgress(noon)).toBeCloseTo(50, 0);
  });

  it("is 0% at local midnight", () => {
    const midnight = new Date("2026-06-15T00:00:00");
    expect(dayProgress(midnight)).toBe(0);
  });

  it("is close to 100% one minute before the next midnight", () => {
    const lateNight = new Date("2026-06-15T23:59:00");
    expect(dayProgress(lateNight)).toBeGreaterThan(99);
  });
});

describe("startOfWeek", () => {
  it("treats Monday as the default week start", () => {
    // 2026-06-17 is a Wednesday
    const wed = new Date("2026-06-17T15:00:00");
    const start = startOfWeek(wed);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getDate()).toBe(15); // the Monday of that week
  });

  it("returns the same date unchanged if it's already the configured week start", () => {
    const mon = new Date("2026-06-15T09:00:00");
    const start = startOfWeek(mon);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0); // normalized to midnight
  });
});

describe("weekProgress", () => {
  it("is 0% at the very start of the week", () => {
    const mon = new Date("2026-06-15T00:00:00");
    expect(weekProgress(mon)).toBe(0);
  });

  it("is ~50% at the midpoint (Thursday noon-ish)", () => {
    // Mon 00:00 -> next Mon 00:00 is a 7-day window; midpoint is Thu 12:00:00... approx
    const mid = new Date("2026-06-18T12:00:00"); // Thursday noon
    const pct = weekProgress(mid);
    expect(pct).toBeGreaterThan(45);
    expect(pct).toBeLessThan(55);
  });
});

describe("cycleProgress (the 84-day window)", () => {
  const cycleStart = "2026-01-01";

  it("is 0% on the first day", () => {
    expect(cycleProgress(cycleStart, new Date("2026-01-01T00:00:00"))).toBe(0);
  });

  it("is ~50% at day 42 (half of 84)", () => {
    const day42 = new Date("2026-02-12T00:00:00"); // Jan 1 + 42 days
    expect(cycleProgress(cycleStart, day42)).toBe(50);
  });

  it("is 100% exactly at day 84", () => {
    const day84 = new Date("2026-03-26T00:00:00"); // Jan 1 + 84 days
    expect(cycleProgress(cycleStart, day84)).toBe(100);
  });

  it("never exceeds 100% after the cycle ends (this is what powers the 'cycle complete' UI)", () => {
    const wellAfter = new Date("2026-05-01T00:00:00");
    expect(cycleProgress(cycleStart, wellAfter)).toBe(100);
  });

  it("uses exactly 84 days, matching TIME_CONSTANTS.CYCLE_DAYS", () => {
    expect(TIME_CONSTANTS.CYCLE_DAYS).toBe(84);
  });
});

describe("cycleDaysRemaining", () => {
  it("reports 84 on day one", () => {
    expect(cycleDaysRemaining("2026-01-01", new Date("2026-01-01T08:00:00"))).toBe(84);
  });

  it("reports 0 once the cycle has fully elapsed, never negative", () => {
    expect(cycleDaysRemaining("2026-01-01", new Date("2026-06-01T00:00:00"))).toBe(0);
  });
});

describe("yearProgress (calendar year, Jan 1 - Dec 31 — explicit product decision)", () => {
  it("is 0% at the very start of the year", () => {
    expect(yearProgress(new Date("2026-01-01T00:00:00"))).toBe(0);
  });

  it("is close to 100% in the last hours of Dec 31", () => {
    expect(yearProgress(new Date("2026-12-31T23:00:00"))).toBeGreaterThan(99);
  });

  it("is NOT anchored to a rolling 365 days from some arbitrary signup date — two different years' Jan 1 both read ~0%", () => {
    expect(yearProgress(new Date("2026-01-01T01:00:00"))).toBeLessThan(1);
    expect(yearProgress(new Date("2027-01-01T01:00:00"))).toBeLessThan(1);
  });
});

describe("dateKey (must be LOCAL date, never UTC-shifted)", () => {
  it("matches the calendar date shown by getFullYear/getMonth/getDate, not toISOString", () => {
    const d = new Date("2026-06-05T23:30:00"); // late evening, local time
    const key = dateKey(d);
    // toISOString() on this exact local time could shift to the next day
    // depending on the runtime's UTC offset — dateKey must NOT do that.
    expect(key).toBe(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  });

  it("pads single-digit months and days with a leading zero", () => {
    expect(dateKey(new Date("2026-01-05T10:00:00"))).toBe("2026-01-05");
  });
});

describe("cycleDayKeys", () => {
  it("produces exactly 84 unique, consecutive date keys", () => {
    const keys = cycleDayKeys("2026-01-01");
    expect(keys.length).toBe(84);
    expect(new Set(keys).size).toBe(84); // all unique
    expect(keys[0]).toBe("2026-01-01");
    expect(keys[83]).toBe("2026-03-25"); // day 84 of the cycle (0-indexed: day 0..83)
  });
});
