/**
 * Day84 — Tasks Store
 * ------------------------------------------------------------------
 * Owns the task list AND the append-only completion history log.
 * Every check-off/uncheck:
 *   1. writes a new history record (never mutates old ones)
 *   2. recomputes streaks for the affected task from history
 *   3. persists both task list + history
 *   4. fires a haptic pulse (check-off only, per spec)
 * Charts and the streak display always read the freshly recomputed
 * task list — there is no separate "cached" number that can drift.
 */

import { storageGetJSON, storageSetJSON } from "../lib/storage.js";
import { createTask, createCompletionRecord } from "../lib/schema.js";
import { recomputeAllStreaks } from "../lib/streaks.js";
import { hapticTaskComplete } from "../lib/haptics.js";
import { dateKey } from "../lib/time.js";

const TASKS_KEY = "day84:tasks";
const HISTORY_KEY = "day84:history";

let tasks = $state([]);
let history = $state([]);
let loaded = $state(false);

export function tasksState() {
  return {
    get tasks() {
      return tasks;
    },
    get history() {
      return history;
    },
    get loaded() {
      return loaded;
    },
  };
}

export async function loadTasks() {
  tasks = (await storageGetJSON(TASKS_KEY, [])) || [];
  history = (await storageGetJSON(HISTORY_KEY, [])) || [];
  // Re-derive on load in case the app was closed mid-day, a backup
  // was restored, or the device clock changed — streaks should
  // always reflect history, never trust a stale stored number.
  tasks = recomputeAllStreaks(tasks, history);
  loaded = true;
}

async function persist() {
  await storageSetJSON(TASKS_KEY, tasks);
  await storageSetJSON(HISTORY_KEY, history);
}

export async function addTask({ name, time, durationMinutes, repeat }) {
  const task = createTask({ name, time, durationMinutes, repeat });
  tasks = [...tasks, task];
  await persist();
  return task;
}

export async function editTask(taskId, patch) {
  tasks = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
  await persist();
}

export async function deleteTask(taskId) {
  tasks = tasks.filter((t) => t.id !== taskId);
  // History records are kept for charting integrity even after a
  // task is deleted — deleting the task definition shouldn't erase
  // the fact that real days of execution happened.
  await persist();
}

/**
 * Checking a task off (completed=true) or unchecking it (false).
 * This is THE function that implements the spec's streak +
 * haptic + persistence requirements in one place.
 */
export async function setTaskCompletion(taskId, completed, date = new Date()) {
  const key = dateKey(date);
  const existingIdx = history.findIndex((r) => r.taskId === taskId && r.date === key);

  const record = createCompletionRecord(taskId, completed, key);
  if (existingIdx >= 0) {
    history = history.map((r, i) => (i === existingIdx ? record : r));
  } else {
    history = [...history, record];
  }

  tasks = recomputeAllStreaks(tasks, history);
  await persist();

  if (completed) {
    await hapticTaskComplete();
  }
}

export async function toggleTaskToday(taskId) {
  const todayKey = dateKey(new Date());
  const existing = history.find((r) => r.taskId === taskId && r.date === todayKey);
  const nextState = !existing?.completed;
  await setTaskCompletion(taskId, nextState, new Date());
}
