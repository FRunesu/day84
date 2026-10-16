/**
 * Day84 — Haptics
 * ------------------------------------------------------------------
 * Capacitor's Haptics plugin throws/no-ops unpredictably when
 * there's no native bridge underneath it (i.e. running in a plain
 * browser tab during web development, or as a PWA). Every call is
 * wrapped so a missing native layer is a silent no-op, never a
 * thrown error that could interrupt a task check-off.
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();

export async function hapticImpact(style = ImpactStyle.Medium) {
  if (!isNative) return;
  try {
    await Haptics.impact({ style });
  } catch (err) {
    console.warn("[day84] haptic impact unavailable", err);
  }
}

/** Fired when a task is checked off — the spec's required trigger. */
export async function hapticTaskComplete() {
  return hapticImpact(ImpactStyle.Medium);
}

/** A lighter tap for less significant interactions (toggles, nav). */
export async function hapticLight() {
  return hapticImpact(ImpactStyle.Light);
}

export async function hapticSuccess() {
  if (!isNative) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (err) {
    console.warn("[day84] haptic notification unavailable", err);
  }
}
