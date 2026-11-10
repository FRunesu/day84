/**
 * Day84 — Notifications
 * Uses @capacitor/local-notifications on native.
 * Web fallback: in-app banners only (no browser push setup required).
 * DAY_NAMES_FULL order matches JS Date.getDay() (0=Sunday).
 */

import { Capacitor } from "@capacitor/core";
import { DAY_NAMES_FULL } from "./schema.js";

const isNative = Capacitor.isNativePlatform();
const WEEKLY_REVIEW_ID = 1000;
const DOUBLE_MISS_BASE_ID = 2000;

// Capacitor weekday: 1=Sunday...7=Saturday
// JS weekday:        0=Sunday...6=Saturday
function jsToCapacitorWeekday(jsDay) { return jsDay + 1; }

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return (Math.abs(h) % 800000) + 100000;
}

let LocalNotifications;
async function getPlugin() {
  if (!isNative) return null;
  if (!LocalNotifications) {
    const mod = await import("@capacitor/local-notifications");
    LocalNotifications = mod.LocalNotifications;
  }
  return LocalNotifications;
}

export async function requestPermissions() {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const { display } = await plugin.requestPermissions();
    return display === "granted";
  } catch { return false; }
}

/**
 * Schedule (or reschedule) the weekly review notification.
 * settings: { weeklyReviewEnabled, weeklyReviewDay, weeklyReviewTime }
 */
export async function scheduleWeeklyReview(settings) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id: WEEKLY_REVIEW_ID }] });
    if (!settings.weeklyReviewEnabled) return;
    const jsWeekday = DAY_NAMES_FULL.indexOf(settings.weeklyReviewDay);
    if (jsWeekday === -1) return;
    const [hour, minute] = settings.weeklyReviewTime.split(":").map(Number);
    await plugin.schedule({
      notifications: [{
        id: WEEKLY_REVIEW_ID,
        title: "Anvil — Weekly Review",
        body: "New week ahead. Take 5 minutes to review your tactics and set your plan.",
        schedule: {
          on: { weekday: jsToCapacitorWeekday(jsWeekday), hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
        channelId: "reviews",
      }],
    });
  } catch (err) { console.warn("[day84] schedule weekly review failed", err); }
}

/**
 * Schedule start-time alerts for all tactics that have a startTime.
 * Each tactic+day combo gets its own notification (repeating weekly).
 */
export async function scheduleTacticAlerts(tactics) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const toSchedule = [];
    for (const tactic of tactics) {
      if (!tactic.startTime || !tactic.days || tactic.days.length === 0) continue;
      const [hour, minute] = tactic.startTime.split(":").map(Number);
      for (const jsDay of tactic.days) {
        const id = hashId(tactic.id + "-" + jsDay);
        toSchedule.push({
          id,
          title: "Anvil — Task Starting",
          body: `Time to start: ${tactic.title}`,
          schedule: {
            on: { weekday: jsToCapacitorWeekday(jsDay), hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: "tasks",
        });
      }
    }
    if (toSchedule.length > 0) {
      await plugin.schedule({ notifications: toSchedule });
    }
  } catch (err) { console.warn("[day84] schedule tactic alerts failed", err); }
}

export async function cancelTacticAlerts(tactic) {
  const plugin = await getPlugin();
  if (!plugin || !tactic.days) return;
  try {
    const ids = tactic.days.map(d => ({ id: hashId(tactic.id + "-" + d) }));
    await plugin.cancel({ notifications: ids });
  } catch (err) { console.warn("[day84] cancel tactic alerts failed", err); }
}

export async function scheduleDoubleMissAlert(tacticName) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const id = DOUBLE_MISS_BASE_ID + hashId(tacticName) % 1000;
    await plugin.schedule({
      notifications: [{
        id,
        title: "Anvil — Don't Break the Chain",
        body: `You've missed "${tacticName}" twice in a row. Don't let this become a habit.`,
        schedule: { at: new Date(Date.now() + 1000) }, // fire immediately
        channelId: "warnings",
      }],
    });
  } catch (err) { console.warn("[day84] double miss alert failed", err); }
}

/** Returns true if today is the user's configured weekly review day. */
export function isReviewDayToday(settings) {
  if (!settings?.weeklyReviewEnabled) return false;
  const todayIdx = new Date().getDay();
  const settingIdx = DAY_NAMES_FULL.indexOf(settings.weeklyReviewDay);
  return todayIdx === settingIdx;
}
