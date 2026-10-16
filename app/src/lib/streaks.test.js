import { describe, it, expect } from "vitest";
import { deriveStreak, todayStats, completionForDate } from "./streaks.js";

const TODAY = new Date("2026-06-26T10:00:00"); // a fixed "now" for deterministic tests
const rec = (date, taskId, completed) => ({ date, taskId, completed, loggedAt: TODAY.toISOString() });

describe("deriveStreak", () => {
  it("is 0 with no history at all", () => {
    expect(deriveStreak("t1", [], TODAY)).toEqual({ streak: 0, lastCompletedDate: null });
  });

  it("is 1 after a single completion today", () => {
    const history = [rec("2026-06-26", "t1", true)];
    expect(deriveStreak("t1", history, TODAY)).toEqual({ streak: 1, lastCompletedDate: "2026-06-26" });
  });

  it("counts consecutive days correctly (4-day run ending today)", () => {
    const history = [
      rec("2026-06-23", "t1", true),
      rec("2026-06-24", "t1", true),
      rec("2026-06-25", "t1", true),
      rec("2026-06-26", "t1", true),
    ];
    expect(deriveStreak("t1", history, TODAY).streak).toBe(4);
  });

  it("still counts a streak that ended YESTERDAY as alive (hasn't checked in yet today)", () => {
    const history = [rec("2026-06-24", "t1", true), rec("2026-06-25", "t1", true)];
    const result = deriveStreak("t1", history, TODAY);
    expect(result.streak).toBe(2);
  });

  it("breaks the streak when there's a 2+ day gap before the most recent completion", () => {
    // last completion was 3 days ago — chain is broken
    const history = [rec("2026-06-20", "t1", true), rec("2026-06-23", "t1", true)];
    const result = deriveStreak("t1", history, TODAY);
    expect(result.streak).toBe(0);
    // but we still remember when they last actually did it
    expect(result.lastCompletedDate).toBe("2026-06-23");
  });

  it("does NOT double count an idempotent re-check of the same day", () => {
    // simulates: checked, unchecked, checked again — only one record per
    // date should exist after the store's upsert-by-date logic, but even
    // if duplicates existed, the Set-based dedup in deriveStreak protects it
    const history = [
      rec("2026-06-25", "t1", true),
      rec("2026-06-26", "t1", true),
      rec("2026-06-26", "t1", true), // duplicate same-day record
    ];
    expect(deriveStreak("t1", history, TODAY).streak).toBe(2);
  });

  it("correctly recomputes after an uncheck removes today's completion", () => {
    // Before uncheck: 3-day streak including today.
    const before = [
      rec("2026-06-24", "t1", true),
      rec("2026-06-25", "t1", true),
      rec("2026-06-26", "t1", true),
    ];
    expect(deriveStreak("t1", before, TODAY).streak).toBe(3);

    // After unchecking today (the store writes completed:false for today,
    // it does not delete the row — deriveStreak must treat completed:false
    // as "not completed" via the .filter(r => r.completed) check):
    const after = [
      rec("2026-06-24", "t1", true),
      rec("2026-06-25", "t1", true),
      rec("2026-06-26", "t1", false),
    ];
    // Today is no longer completed, but yesterday's streak of 2 is still alive
    // (chain isn't broken yet — they can still check in today).
    expect(deriveStreak("t1", after, TODAY).streak).toBe(2);
  });

  it("only counts completions for the specified task, ignoring other tasks' history", () => {
    const history = [
      rec("2026-06-26", "t1", true),
      rec("2026-06-26", "t2", true),
      rec("2026-06-25", "t2", true),
    ];
    expect(deriveStreak("t1", history, TODAY).streak).toBe(1);
    expect(deriveStreak("t2", history, TODAY).streak).toBe(2);
  });
});

describe("todayStats", () => {
  const tasks = [
    { id: "t1", archived: false },
    { id: "t2", archived: false },
    { id: "t3", archived: true }, // archived tasks shouldn't count
  ];

  it("reports 0/0 with no active tasks completed", () => {
    expect(todayStats([], [], TODAY)).toEqual({ completed: 0, total: 0, pct: 0 });
  });

  it("correctly counts completed vs total, excluding archived tasks", () => {
    const history = [rec("2026-06-26", "t1", true), rec("2026-06-26", "t3", true)];
    const stats = todayStats(tasks, history, TODAY);
    expect(stats.total).toBe(2); // t3 excluded — archived
    expect(stats.completed).toBe(1); // only t1 counts
    expect(stats.pct).toBe(50);
  });
});

describe("completionForDate", () => {
  it("returns null when there's no data logged for that date (distinguishes 'no data' from '0%')", () => {
    expect(completionForDate("2026-06-26", [], [])).toBeNull();
  });

  it("computes the correct percentage when some tasks were completed", () => {
    const history = [
      rec("2026-06-26", "t1", true),
      rec("2026-06-26", "t2", false),
      rec("2026-06-26", "t3", true),
    ];
    expect(completionForDate("2026-06-26", [], history)).toBeCloseTo(66.7, 1);
  });
});
