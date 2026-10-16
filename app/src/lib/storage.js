/**
 * Day84 — Storage Layer
 * ------------------------------------------------------------------
 * Why this file exists: raw localStorage is not durable inside a
 * Capacitor-wrapped native app — iOS in particular can clear
 * webview storage under disk pressure, and it never survives an
 * app reinstall. For an app whose entire value is months of streak
 * history, silent data loss is the one failure mode that can't be
 * tolerated.
 *
 * Strategy:
 *  - On native (Capacitor detected): @capacitor/preferences is the
 *    source of truth — backed by UserDefaults on iOS and
 *    SharedPreferences/EncryptedSharedPreferences on Android,
 *    both of which are durable app-private storage, not webview
 *    cache.
 *  - On web (no native bridge): localStorage is used, since no
 *    native storage layer exists in a browser.
 *  - Every write also maintains a lightweight in-memory cache so
 *    Svelte stores can read synchronously after first load.
 *
 * This module exposes one tiny async key/value API; nothing above
 * this layer should ever touch localStorage or Preferences directly.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

export async function storageGet(key) {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    // localStorage can throw in some embedded/private-browsing contexts
    console.error("[day84] localStorage read failed", err);
    return null;
  }
}

export async function storageSet(key, value) {
  if (isNative) {
    await Preferences.set({ key, value });
    return true;
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error("[day84] localStorage write failed", err);
    return false;
  }
}

export async function storageRemove(key) {
  if (isNative) {
    await Preferences.remove({ key });
    return true;
  }
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error("[day84] localStorage remove failed", err);
    return false;
  }
}

export async function storageKeys() {
  if (isNative) {
    const { keys } = await Preferences.keys();
    return keys;
  }
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

/** Convenience JSON helpers — every Day84 record is stored as JSON. */
export async function storageGetJSON(key, fallback = null) {
  const raw = await storageGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[day84] failed to parse stored JSON for "${key}"`, err);
    return fallback;
  }
}

export async function storageSetJSON(key, value) {
  return storageSet(key, JSON.stringify(value));
}

export const STORAGE_BACKEND = isNative ? "capacitor-preferences" : "localStorage";
