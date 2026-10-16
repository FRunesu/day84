/**
 * Day84 — Weekly Score Engine
 * Score = (completed tactic-day instances / total planned) * 100
 * Denominator is always the FULL week's planned load, not just elapsed days.
 */

import { dateKey, addDays, startOfWeek } from "./time.js";

/** Mon–Sun bounds for the week containing `date`. */
export function getWeekBounds(date = new Date()) {
  const start = startOfWeek(date, 1); // Monday
  const end = addDays(start, 6);       // Sunday
  return { weekStart: start, weekEnd: end };
}

/** Current week number (1–12) within the period. */
export function getWeekNumber(periodStartDate, now = new Date()) {
  const start = new Date(periodStartDate + "T00:00:00");
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1));
}

/**
 * Every (tacticId, date) pair that was PLANNED in the given week.
 * A tactic planned Mon/Wed/Fri produces 3 instances per week.
 */
export function getPlannedInstances(tactics, weekStart) {
  const instances = [];
  for (const tactic of tactics) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      if (tactic.days.includes(day.getDay())) {
        instances.push({ tacticId: tactic.id, date: dateKey(day) });
      }
    }
  }
  return instances;
}

/**
 * Which of the planned instances have a completed=true record.
 */
export function getCompletedInstances(plannedInstances, completions) {
  const completedSet = new Set(
    completions
      .filter(c => c.completed)
      .map(c => `${c.tacticId}:${c.date}`)
  );
  return plannedInstances.filter(p => completedSet.has(`${p.tacticId}:${p.date}`));
}

/**
 * Same shape as calculateWeekScore, but scoped to a single day —
 * planned is just the tactics scheduled on `date`'s weekday.
 */
export function calculateDayScore(tactics, completions, date = new Date()) {
  const key = dateKey(date);
  const jsDay = date.getDay();
  const planned = tactics.filter(t => t.days && t.days.includes(jsDay));
  const completedSet = new Set(
    completions.filter(c => c.completed).map(c => `${c.tacticId}:${c.date}`)
  );
  const completed = planned.filter(t => completedSet.has(`${t.id}:${key}`));
  const score = planned.length === 0
    ? 0
    : Math.round((completed.length / planned.length) * 1000) / 10;
  return {
    score,
    planned: planned.length,
    completed: completed.length,
    status: scoreStatus(score),
  };
}

/**
 * Main scoring function. Returns { score, planned, completed, status }.
 */
export function calculateWeekScore(tactics, completions, weekStart) {
  const planned = getPlannedInstances(tactics, weekStart);
  const completed = getCompletedInstances(planned, completions);
  const score = planned.length === 0
    ? 0
    : Math.round((completed.length / planned.length) * 1000) / 10;
  return {
    score,
    planned: planned.length,
    completed: completed.length,
    status: scoreStatus(score),
  };
}

/** 'success' | 'warning' | 'danger' */
export function scoreStatus(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export function scoreColor(score) {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--danger)";
}

/** Scores for all 12 weeks of a period, derived from completions. */
export function allWeekScores(tactics, completions, periodStartDate) {
  const start = new Date(periodStartDate + "T00:00:00");
  const scores = [];
  for (let w = 0; w < 12; w++) {
    const weekStart = addDays(start, w * 7);
    const result = calculateWeekScore(tactics, completions, weekStart);
    scores.push({ week: w + 1, ...result });
  }
  return scores;
}
