/**
 * Day84 — Annual Wrap
 * Computed from cycleReviews + completions for a given calendar year.
 * Nothing is pre-stored — derived fresh at display time.
 */

import { dateKey } from "./time.js";

export function computeAnnualWrap(cycleReviews = [], tactics = [], completions = [], year = new Date().getFullYear()) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // Filter data within the calendar year
  const yearReviews = cycleReviews.filter(r => r.completedDate >= yearStart && r.completedDate <= yearEnd);
  const yearCompletions = completions.filter(c => c.date >= yearStart && c.date <= yearEnd && c.completed);

  // Weekly scores from all reviews
  const allWeeklyScores = yearReviews.flatMap(r => r.weeklyScores || []);
  const avgScore = allWeeklyScores.length === 0 ? 0
    : Math.round(allWeeklyScores.reduce((a, b) => a + b.score, 0) / allWeeklyScores.length * 10) / 10;
  const bestWeek = allWeeklyScores.length === 0 ? null
    : allWeeklyScores.reduce((best, w) => w.score > best.score ? w : best, allWeeklyScores[0]);

  // Goals achieved
  const allGoalReflections = yearReviews.flatMap(r => r.goalReflections || []);
  const goalsSet = allGoalReflections.length;
  const goalsAchieved = allGoalReflections.filter(g => g.achieved).length;

  // Completions by tactic
  const completionsByTactic = {};
  for (const c of yearCompletions) {
    completionsByTactic[c.tacticId] = (completionsByTactic[c.tacticId] || 0) + 1;
  }

  // Most consistent tactic
  let mostConsistentTactic = null;
  let maxCompletions = 0;
  for (const [tacticId, count] of Object.entries(completionsByTactic)) {
    if (count > maxCompletions) {
      maxCompletions = count;
      const tactic = tactics.find(t => t.id === tacticId);
      if (tactic) mostConsistentTactic = { name: tactic.title, count };
    }
  }

  // Total planned vs completed (rough: count all completions logged)
  const totalCompleted = yearCompletions.length;

  return {
    year,
    cyclesCompleted: yearReviews.length,
    avgWeeklyScore: avgScore,
    bestWeek,
    goalsSet,
    goalsAchieved,
    totalCompleted,
    mostConsistentTactic,
    weeklyScoreData: allWeeklyScores,
  };
}
