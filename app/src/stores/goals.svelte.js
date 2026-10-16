/**
 * Goals + Tactics + Completions store.
 * The three are tightly coupled — checked off here together.
 */
import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { createGoal, createTactic, createCompletion, KEYS } from "../lib/schema.js";
import { recomputeAllStreaks, getDoubleMissTactics } from "../lib/tacticsEngine.js";
import { hapticTaskComplete } from "../lib/haptics.js";
import { dateKey } from "../lib/time.js";

let goals = $state([]);
let tactics = $state([]);
let completions = $state([]);
let loaded = $state(false);

export function goalsState() {
  return {
    get goals() { return goals; },
    get tactics() { return tactics; },
    get completions() { return completions; },
    get loaded() { return loaded; },
    get doubleMissTactics() { return getDoubleMissTactics(tactics, completions); },
  };
}

export async function loadGoals() {
  goals = (await storageGetJSON(KEYS.GOALS, [])) || [];
  tactics = (await storageGetJSON(KEYS.TACTICS, [])) || [];
  completions = (await storageGetJSON(KEYS.COMPLETIONS, [])) || [];
  tactics = recomputeAllStreaks(tactics, completions);
  loaded = true;
}

async function persist() {
  await storageSetJSON(KEYS.GOALS, goals);
  await storageSetJSON(KEYS.TACTICS, tactics);
  await storageSetJSON(KEYS.COMPLETIONS, completions);
}

// ---- Goals ----

export async function addGoal({ title, visionCategoryId = null }) {
  if (goals.length >= 4) return null;
  const goal = createGoal({ title, order: goals.length, visionCategoryId });
  goals = [...goals, goal];
  await storageSetJSON(KEYS.GOALS, goals);
  return goal;
}

export async function editGoal(goalId, patch) {
  goals = goals.map(g => g.id === goalId ? { ...g, ...patch } : g);
  await storageSetJSON(KEYS.GOALS, goals);
}

export async function deleteGoal(goalId) {
  goals = goals.filter(g => g.id !== goalId);
  // Also remove tactics belonging to this goal
  const orphanIds = tactics.filter(t => t.goalId === goalId).map(t => t.id);
  tactics = tactics.filter(t => t.goalId !== goalId);
  completions = completions.filter(c => !orphanIds.includes(c.tacticId));
  await persist();
}

// ---- Tactics ----

export async function addTactic({ goalId, title, days, startTime, trackStreak = false }) {
  const tactic = createTactic({ goalId, title, days, startTime, trackStreak });
  tactics = [...tactics, tactic];
  await storageSetJSON(KEYS.TACTICS, tactics);
  return tactic;
}

export async function editTactic(tacticId, patch) {
  tactics = tactics.map(t => t.id === tacticId ? { ...t, ...patch } : t);
  await storageSetJSON(KEYS.TACTICS, tactics);
}

export async function deleteTactic(tacticId) {
  tactics = tactics.filter(t => t.id !== tacticId);
  completions = completions.filter(c => c.tacticId !== tacticId);
  await persist();
}

// ---- Completions ----

export async function toggleCompletion(tacticId, date = new Date()) {
  const key = dateKey(date);
  const existing = completions.find(c => c.tacticId === tacticId && c.date === key);
  const nextState = !(existing?.completed ?? false);

  if (existing) {
    completions = completions.map(c =>
      c.tacticId === tacticId && c.date === key
        ? { ...c, completed: nextState, loggedAt: new Date().toISOString() }
        : c
    );
  } else {
    completions = [...completions, createCompletion(tacticId, key, nextState)];
  }

  tactics = recomputeAllStreaks(tactics, completions);
  await persist();

  if (nextState) await hapticTaskComplete();
  return nextState;
}

export function isTacticCompleted(tacticId, date = new Date()) {
  const key = dateKey(date);
  return completions.some(c => c.tacticId === tacticId && c.date === key && c.completed);
}

// ---- Resets ----

export async function wipeGoalsAndTactics() {
  goals = [];
  tactics = [];
  completions = [];
  await storageRemove(KEYS.GOALS);
  await storageRemove(KEYS.TACTICS);
  await storageRemove(KEYS.COMPLETIONS);
}
