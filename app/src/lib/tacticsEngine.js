/**
 * Day84 — Tactics Engine
 * Streak derivation + double-miss detection.
 * Key fix: double-miss only triggers for scheduled days AFTER the tactic
 * was created. Without this, a brand-new tactic immediately fires a warning
 * because it has no completion records for past scheduled days that predate it.
 */

import { dateKey, addDays } from "./time.js";

/**
 * Returns the last `count` scheduled days before today,
 * optionally filtered to only dates on or after `afterDate`.
 */
export function getPastScheduledDays(days, count, now = new Date(), afterDate = null) {
  const results = [];
  let cursor = addDays(now, -1);
  let limit = 365;
  while (results.length < count && limit-- > 0) {
    if (days.includes(cursor.getDay())) {
      const key = dateKey(cursor);
      if (!afterDate || key >= afterDate) {
        results.push(key);
      }
    }
    cursor = addDays(cursor, -1);
  }
  return results;
}

/** Streak = consecutive SCHEDULED days completed without a gap. */
export function deriveTacticStreak(tacticId, days, completions, now = new Date()) {
  if (!days || days.length === 0) return { streak: 0, lastCompletedDate: null };

  const completedDates = new Set(
    completions.filter(c => c.tacticId === tacticId && c.completed).map(c => c.date)
  );
  if (completedDates.size === 0) return { streak: 0, lastCompletedDate: null };

  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(addDays(now, -1));

  const aliveToday = completedDates.has(todayKey) && days.includes(now.getDay());
  const aliveYesterday = completedDates.has(yesterdayKey) && days.includes(addDays(now, -1).getDay());

  if (!aliveToday && !aliveYesterday) {
    const lastDate = [...completedDates].sort().pop() ?? null;
    return { streak: 0, lastCompletedDate: lastDate };
  }

  let streak = 0;
  let cursor = aliveToday ? new Date(now) : addDays(now, -1);
  while (streak < 365) {
    if (days.includes(cursor.getDay())) {
      if (completedDates.has(dateKey(cursor))) streak++;
      else break;
    }
    cursor = addDays(cursor, -1);
  }

  const lastDate = [...completedDates].sort().pop() ?? null;
  return { streak, lastCompletedDate: lastDate };
}

/**
 * Returns true if the last two scheduled days AFTER the tactic was created
 * were both missed. Respects createdDate so brand-new tactics never trigger.
 */
export function checkDoubleMiss(tactic, completions, now = new Date()) {
  if (!tactic.days || tactic.days.length === 0) return false;

  // Only look at scheduled days on or after the tactic's creation date
  const afterDate = tactic.createdDate || null;
  const pastScheduled = getPastScheduledDays(tactic.days, 10, now, afterDate);

  // Need at least 2 past scheduled days since creation to trigger a warning
  if (pastScheduled.length < 2) return false;

  const lastTwo = pastScheduled.slice(0, 2);
  const completedDates = new Set(
    completions.filter(c => c.tacticId === tactic.id && c.completed).map(c => c.date)
  );
  return !completedDates.has(lastTwo[0]) && !completedDates.has(lastTwo[1]);
}

export function recomputeAllStreaks(tactics, completions, now = new Date()) {
  return tactics.map(t => {
    const { streak, lastCompletedDate } = deriveTacticStreak(t.id, t.days, completions, now);
    return { ...t, streak, lastCompletedDate };
  });
}

export function getDoubleMissTactics(tactics, completions, now = new Date()) {
  return tactics.filter(t =>
    t.days && t.days.length > 0 && checkDoubleMiss(t, completions, now)
  );
}
