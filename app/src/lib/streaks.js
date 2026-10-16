/**
 * Day84 — Streak Engine
 * ------------------------------------------------------------------
 * A bare increment/decrement counter cannot express contiguity: it
 * has no memory of WHEN it was last bumped, so it can't tell "I did
 * this every day" apart from "I did this twice, three days apart."
 * Every streak number in this app is therefore DERIVED from the
 * append-only completion history log, never hand-incremented.
 *
 * Rule:
 *  - Checking off a repeat task today, when it was last completed
 *    exactly yesterday -> streak += 1.
 *  - Checking off a repeat task today, when it was last completed
 *    today already -> no-op (idempotent double-tap protection).
 *  - Checking off a repeat task today, with a gap of 2+ days (or no
 *    prior completion) -> streak resets to 1.
 *  - Unchecking is NOT "decrement by 1" — it removes today's
 *    completion record and the streak is RECOMPUTED from history,
 *    so undo can never leave a number that doesn't match reality.
 */

import { dateKey, addDays } from "./time.js";

/**
 * Recompute a task's current streak purely from its completion
 * history. This is the only function that should ever set
 * task.streak — call it after every history mutation.
 *
 * @param {string} taskId
 * @param {CompletionRecord[]} history   - full history log (all tasks)
 * @param {Date} now
 * @returns {{ streak: number, lastCompletedDate: string|null }}
 */
export function deriveStreak(taskId, history, now = new Date()) {
  const completedDates = new Set(
    history
      .filter((r) => r.taskId === taskId && r.completed)
      .map((r) => r.date)
  );

  if (completedDates.size === 0) {
    return { streak: 0, lastCompletedDate: null };
  }

  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(addDays(now, -1));

  // The streak only "counts" if it's still alive — i.e. the most
  // recent completion was today or yesterday. Otherwise it's broken.
  const mostRecentlyCompletedToday = completedDates.has(todayKey);
  const mostRecentlyCompletedYesterday = completedDates.has(yesterdayKey);

  if (!mostRecentlyCompletedToday && !mostRecentlyCompletedYesterday) {
    // Chain is broken — last completion was 2+ days ago.
    // Still report what the streak WAS, for display purposes,
    // but it's effectively reset the next time the task is checked.
    return { streak: 0, lastCompletedDate: lastDateIn(completedDates) };
  }

  // Walk backwards from the most recent completed day, counting
  // consecutive days, until we hit a gap.
  let cursor = mostRecentlyCompletedToday ? new Date(now) : addDays(now, -1);
  let streak = 0;
  while (completedDates.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { streak, lastCompletedDate: lastDateIn(completedDates) };
}

function lastDateIn(dateSet) {
  return [...dateSet].sort().pop() ?? null;
}

/**
 * Recompute streaks for every task after a history mutation.
 * Call this once after toggling a task, then persist the updated
 * task list — keeps the derivation centralized in one place.
 */
export function recomputeAllStreaks(tasks, history, now = new Date()) {
  return tasks.map((task) => {
    const { streak, lastCompletedDate } = deriveStreak(task.id, history, now);
    return { ...task, streak, lastCompletedDate };
  });
}

/**
 * Today's completion stats across all (non-archived) tasks —
 * powers the Completion Ring on Home/Metrics.
 */
export function todayStats(tasks, history, now = new Date()) {
  const todayKey = dateKey(now);
  const active = tasks.filter((t) => !t.archived);
  const completedToday = new Set(
    history
      .filter((r) => r.date === todayKey && r.completed)
      .map((r) => r.taskId)
  );
  const completed = active.filter((t) => completedToday.has(t.id)).length;
  const total = active.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;
  return { completed, total, pct };
}

/**
 * Completion % for a single day, across all tasks that existed
 * and were active on that day — backbone of the 12-week heatmap.
 */
export function completionForDate(dateStr, tasks, history) {
  const recordsForDate = history.filter((r) => r.date === dateStr);
  if (recordsForDate.length === 0) return null; // no data that day
  const completed = recordsForDate.filter((r) => r.completed).length;
  const total = recordsForDate.length;
  return Math.round((completed / total) * 1000) / 10;
}
