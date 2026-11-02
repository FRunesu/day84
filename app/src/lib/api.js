/**
 * Day84 — Backend API Client
 * ------------------------------------------------------------------
 * The ONLY part of Day84 that talks to a server. Everything else
 * works fully offline. The server's jobs: invites, linking up to 6
 * partners, privacy-filtered sync of shared fields, and "Push"
 * nudges between partners.
 *
 * Privacy note: this client does NOT decide what's private. It sends
 * the user's full sharePrefs to the server, and the SERVER filters
 * what partners receive — see backend/src/routes/sync.js.
 *
 * The base URL can be overridden at runtime (Settings → Sync server)
 * so a test build can point at any deployment without a rebuild.
 */

import { storageGet, storageSet, storageRemove } from "./storage.js";

const API_BASE_KEY = "day84:apiBase";
export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

let apiBase = DEFAULT_API_BASE;

export function getApiBase() {
  return apiBase;
}

export async function loadApiBase() {
  const stored = await storageGet(API_BASE_KEY);
  if (stored) apiBase = stored;
  return apiBase;
}

export async function setApiBase(url) {
  const clean = (url || "").trim().replace(/\/+$/, "");
  if (!clean || clean === DEFAULT_API_BASE) {
    apiBase = DEFAULT_API_BASE;
    await storageRemove(API_BASE_KEY);
  } else {
    apiBase = clean;
    await storageSet(API_BASE_KEY, clean);
  }
  return apiBase;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      ...options,
    });
  } catch {
    throw new Error("Can't reach the sync server. Check your connection or the server URL in Settings.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export function checkHealth() {
  return request("/health", { method: "GET" });
}

/** Creates an invite; returns the invite code (also emailed when the server has email configured). */
export function sendInvite({ userId, userName, recipientEmail }) {
  return request("/invite", {
    method: "POST",
    body: JSON.stringify({ userId, userName, recipientEmail }),
  });
}

/** The inviter's invites with their current status. */
export function fetchInvites({ userId }) {
  return request(`/invites/${encodeURIComponent(userId)}`, { method: "GET" });
}

/** Accepts an invite code (the recipient entering it in-app). */
export function acceptInvite({ token, userId, userName }) {
  return request("/link/accept", {
    method: "POST",
    body: JSON.stringify({ token, userId, userName }),
  });
}

/** Pushes this user's CURRENT sharePrefs + fields to the server. */
export function pushSharedData(payload) {
  return request("/sync/push", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Everyone I'm linked with, each with what they've chosen to share with me. */
export function fetchPartners({ userId }) {
  return request(`/sync/partners/${encodeURIComponent(userId)}`, { method: "GET" });
}

export function sendPush({ fromId, toId }) {
  return request("/push", {
    method: "POST",
    body: JSON.stringify({ fromId, toId }),
  });
}

export function fetchPushes({ userId }) {
  return request(`/push/${encodeURIComponent(userId)}`, { method: "GET" });
}

/**
 * Deletes the account and cascades: every record the backend was
 * sharing with partners is removed in the SAME operation.
 */
export function deleteAccountAndCascade({ userId }) {
  return request(`/account/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

/** Unlink one partner (partnerId) or all (no partnerId). */
export function unlinkPartner({ userId, partnerId }) {
  return request("/link/unlink", {
    method: "POST",
    body: JSON.stringify({ userId, partnerId }),
  });
}

export function checkSubscriptionStatus({ userId }) {
  return request(`/subscription/${encodeURIComponent(userId)}`, { method: "GET" });
}
