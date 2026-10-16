/**
 * Day84 — Data Schema v2
 * New model: Identity, Vision, Period, Goals, Tactics, Completions, Reviews
 */

import { dateKey } from "./time.js";

export const SCHEMA_VERSION = 2;

export const KEYS = {
  USER: "day84:user",
  IDENTITY: "day84:identity",
  PERIOD: "day84:period",
  GOALS: "day84:goals",
  TACTICS: "day84:tactics",
  COMPLETIONS: "day84:completions",
  CYCLE_REVIEWS: "day84:cycleReviews",
  NOTIFICATION_SETTINGS: "day84:notificationSettings",
  VISION_DISMISS: "day84:visionDismiss",
  PARTNER: "day84:partner",
  INVITES: "day84:invites",
};

export const DEFAULT_VISION_CATEGORIES = [
  { id: "physical", name: "Physical", text: "", order: 0 },
  { id: "spiritual", name: "Spiritual", text: "", order: 1 },
  { id: "mental", name: "Mental", text: "", order: 2 },
  { id: "relationships", name: "Relationships", text: "", order: 3 },
  { id: "financial", name: "Financial", text: "", order: 4 },
  { id: "professional", name: "Professional", text: "", order: 5 },
  { id: "personal", name: "Personal", text: "", order: 6 },
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function createIdentity({ statement = "", categories = null } = {}) {
  return {
    statement,
    categories: categories ?? DEFAULT_VISION_CATEGORIES.map(c => ({ ...c })),
  };
}

export function createPeriod({ name = "", startDate = null } = {}) {
  const sd = startDate || dateKey(new Date());
  const start = new Date(sd + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 83); // 84 days total
  return {
    id: crypto.randomUUID(),
    name: name || `Cycle — ${sd}`,
    startDate: sd,
    endDate: dateKey(end),
  };
}

export function createGoal({ title, order = 0, visionCategoryId = null } = {}) {
  return {
    id: crypto.randomUUID(),
    title: title || "",
    order,
    visionCategoryId,
  };
}

export function createTactic({ goalId, title, days = [], startTime = null, trackStreak = false } = {}) {
  return {
    id: crypto.randomUUID(),
    goalId,
    title: title || "",
    days,
    startTime,
    trackStreak,
    createdDate: dateKey(new Date()), // used to prevent false double-miss warnings on new tactics
    streak: 0,
    lastCompletedDate: null,
  };
}

export function createCompletion(tacticId, date, completed) {
  return { tacticId, date, completed, loggedAt: new Date().toISOString() };
}

export function createCycleReview({ periodId, periodName, weeklyScores = [], goalReflections = [] } = {}) {
  return {
    id: crypto.randomUUID(),
    periodId,
    periodName,
    completedDate: dateKey(new Date()),
    notes: "",
    weeklyScores,
    goalReflections, // [{ goalId, title, achieved: boolean, notes: "" }]
    sharedWithPartner: false,
  };
}

export function defaultNotificationSettings() {
  return {
    weeklyReviewEnabled: false,
    weeklyReviewDay: "Sunday",
    weeklyReviewTime: "20:00",
    taskAlertsEnabled: false,
  };
}

export function defaultSharePrefs() {
  return {
    shareStreaks: true,
    shareCycleProgress: true,
    shareGoalText: false,
    shareVisionText: false,
  };
}
