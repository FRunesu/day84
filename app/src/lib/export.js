/**
 * Day84 — Export / Import (Backup)
 * ------------------------------------------------------------------
 * A manual backup path is required regardless of which storage
 * backend is active (Capacitor Preferences or localStorage). No
 * storage layer should ever be the ONLY copy of a user's data.
 * This produces a single portable JSON file the user can save
 * (e.g. to their own cloud drive) and restore from on any device.
 */

import { storageGetJSON, storageSetJSON } from "./storage.js";
import { SCHEMA_VERSION } from "./schema.js";

const KEYS = ["day84:user", "day84:tasks", "day84:history", "day84:invites", "day84:partner"];

export async function exportAllData() {
  const payload = { exportVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: {} };
  for (const key of KEYS) {
    payload.data[key] = await storageGetJSON(key, null);
  }
  return payload;
}

/** Triggers a native file-save / browser download of the backup JSON. */
export async function downloadBackup() {
  const payload = await exportAllData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `day84-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Restores from a previously exported backup object.
 * Caller is responsible for confirming this with the user first —
 * it overwrites all local data.
 */
export async function restoreFromBackup(payload) {
  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("That file doesn't look like a Anvil backup.");
  }
  for (const key of KEYS) {
    if (payload.data[key] !== undefined && payload.data[key] !== null) {
      await storageSetJSON(key, payload.data[key]);
    }
  }
  return true;
}

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(new Error("That file isn't valid JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
