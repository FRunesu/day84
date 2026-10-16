/**
 * Day84 — Time Engine
 * ------------------------------------------------------------------
 * Single source of truth for every "% of time elapsed" calculation
 * in the app (Day, Week, 12-Week Cycle, Year). Every period goes
 * through the same getElapsedPercent() function so the rounding
 * and edge-case behavior can never drift apart between screens.
 *
 * Key decisions (per spec discussion):
 *  - Day/Week are computed from LOCAL midnight, not a fixed
 *    86,400,000ms offset, so results stay correct across DST
 *    transitions (the two days a year are 23 or 25 hours long).
 *  - The 12-Week Cycle is anchored to a stored `cycleStartDate`
 *    (set once at onboarding), not recalculated from "today" —
 *    cycleStartDate + 84 days, fixed.
 *  - The Year is anchored to the calendar year (Jan 1 -> Dec 31),
 *    per explicit product decision — not a rolling 365 days.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = 84; // 12 weeks * 7 days

/** Local midnight for the given date (defaults to now). */
export function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Start of the user's week. weekStartsOn: 0=Sun ... 1=Mon (default Monday). */
export function startOfWeek(date = new Date(), weekStartsOn = 1) {
  const d = startOfLocalDay(date);
  const day = d.getDay(); // 0-6, Sun-Sat
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

export function startOfNextYear(date = new Date()) {
  return new Date(date.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

/**
 * Generic elapsed-percentage calculator. All four dashboard bars
 * call this with different (start, end) pairs — this is the only
 * place the math actually happens.
 * Returns a number 0-100, clamped, rounded to 1 decimal place.
 */
export function getElapsedPercent(start, end, now = new Date()) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const nowMs = now.getTime();

  if (endMs <= startMs) return 0; // malformed range guard
  if (nowMs <= startMs) return 0;
  if (nowMs >= endMs) return 100;

  const pct = ((nowMs - startMs) / (endMs - startMs)) * 100;
  return Math.round(pct * 10) / 10;
}

/** Day progress: local midnight -> next local midnight. */
export function dayProgress(now = new Date()) {
  const start = startOfLocalDay(now);
  const end = new Date(start.getTime() + DAY_MS);
  return getElapsedPercent(start, end, now);
}

/** Week progress: configurable week start -> next week start. */
export function weekProgress(now = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(now, weekStartsOn);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return getElapsedPercent(start, end, now);
}

/**
 * 12-Week Cycle progress, anchored to a stored cycleStartDate
 * (an ISO string or Date), fixed window of exactly 84 days.
 * If the cycle has fully elapsed, callers should prompt the user
 * to start a new cycle — see cycleStatus() below.
 */
export function cycleProgress(cycleStartDate, now = new Date()) {
  const start = startOfLocalDay(new Date(cycleStartDate));
  const end = new Date(start.getTime() + CYCLE_DAYS * DAY_MS);
  return getElapsedPercent(start, end, now);
}

export function cycleEndDate(cycleStartDate) {
  const start = startOfLocalDay(new Date(cycleStartDate));
  return new Date(start.getTime() + CYCLE_DAYS * DAY_MS);
}

export function cycleDaysRemaining(cycleStartDate, now = new Date()) {
  const end = cycleEndDate(cycleStartDate);
  const remainingMs = end.getTime() - startOfLocalDay(now).getTime();
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}

export function cycleStatus(cycleStartDate, now = new Date()) {
  const pct = cycleProgress(cycleStartDate, now);
  return pct >= 100 ? "complete" : "active";
}

/** Year progress: calendar year, Jan 1 -> Dec 31 (product decision). */
export function yearProgress(now = new Date()) {
  return getElapsedPercent(startOfYear(now), startOfNextYear(now), now);
}

/** All four headline numbers in one call, for the dashboard. */
export function getDashboardProgress(cycleStartDate, now = new Date()) {
  return {
    day: dayProgress(now),
    week: weekProgress(now),
    cycle: cycleStartDate ? cycleProgress(cycleStartDate, now) : 0,
    year: yearProgress(now),
  };
}

/** YYYY-MM-DD key in LOCAL time (never use toISOString() for this —
 *  it converts to UTC first and can shift the date near midnight). */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Every date key in the current 84-day cycle, in order — the
 *  exact backbone the heatmap component renders against. */
export function cycleDayKeys(cycleStartDate) {
  const start = startOfLocalDay(new Date(cycleStartDate));
  const keys = [];
  for (let i = 0; i < CYCLE_DAYS; i++) {
    keys.push(dateKey(addDays(start, i)));
  }
  return keys;
}

export const TIME_CONSTANTS = { DAY_MS, CYCLE_DAYS };
