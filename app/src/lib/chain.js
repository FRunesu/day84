/**
 * Day84 — Unbroken Chain
 * ------------------------------------------------------------------
 * One status per cycle day, derived from tactics + completions:
 *   done  — every tactic planned that day was completed
 *   miss  — at least one planned tactic was not completed (past days)
 *   today — today, not (yet) fully complete
 *   rest  — nothing planned that day (or the tactics didn't exist yet)
 *   future
 * The chain counts consecutive "done" days; rest days don't break it.
 */
import { cycleDayKeys, dateKey } from "./time.js";

export function dayStatus(key, tactics, completions, todayKey = dateKey(new Date())) {
  if (key > todayKey) return "future";
  const jsDay = new Date(key + "T00:00:00").getDay();
  const planned = tactics.filter((t) => t.days?.includes(jsDay) && (!t.createdDate || t.createdDate <= key));
  if (planned.length === 0) return "rest";
  const done = new Set(completions.filter((c) => c.completed && c.date === key).map((c) => c.tacticId));
  const complete = planned.every((t) => done.has(t.id));
  if (complete) return "done";
  return key === todayKey ? "today" : "miss";
}

export function chainDays(cycleStartDate, tactics, completions, now = new Date()) {
  const todayKey = dateKey(now);
  return cycleDayKeys(cycleStartDate).map((key) => ({ key, status: dayStatus(key, tactics, completions, todayKey) }));
}

/** { current, best } — current counts back from today (or yesterday if today isn't done yet). */
export function chainStats(days) {
  let best = 0, run = 0;
  for (const d of days) {
    if (d.status === "done") { run++; best = Math.max(best, run); }
    else if (d.status === "miss") run = 0;
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const s = days[i].status;
    if (s === "future" || s === "rest" || s === "today") continue;
    if (s === "done") current++;
    else break;
  }
  return { current, best };
}
