/**
 * Day84 — Backend API Client
 * ------------------------------------------------------------------
 * This is the ONLY part of Day84 that talks to a server. Everything
 * else (tasks, streaks, the time dashboard, charts) works fully
 * offline. This client talks to the small backend in /backend,
 * whose sole job is: send invite emails, link two accounts, and
 * sync only the fields a user has explicitly opted to share.
 *
 * Privacy note: this client does NOT decide what's private. It
 * sends the user's full sharePrefs choices to the server, and the
 * SERVER is what filters what the partner actually receives — see
 * backend/src/routes/sync.js. A client-side-only filter would let
 * a technically curious partner see "hidden" fields just by
 * inspecting network traffic, which defeats the point of the toggle.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

/** Sends a real invite email containing a linking token + app download link. */
export function sendInvite({ userId, userName, recipientEmail }) {
  return request("/invite", {
    method: "POST",
    body: JSON.stringify({ userId, userName, recipientEmail }),
  });
}

/** Accepts an invite token (the recipient opening the link in-app). */
export function acceptInvite({ token, userId, userName }) {
  return request("/link/accept", {
    method: "POST",
    body: JSON.stringify({ token, userId, userName }),
  });
}

/** Pushes this user's CURRENT sharePrefs + the allowed fields to the server. */
export function pushSharedData({ userId, sharePrefs, streaks, cycleProgress, goalText, visionText }) {
  return request("/sync/push", {
    method: "POST",
    body: JSON.stringify({ userId, sharePrefs, streaks, cycleProgress, goalText, visionText }),
  });
}

/** Fetches whatever the linked partner has chosen to share with ME. */
export function fetchPartnerData({ userId }) {
  return request(`/sync/partner/${encodeURIComponent(userId)}`, { method: "GET" });
}

/**
 * Deletes the account and, per product rule, cascades: every record
 * the backend was sharing with a linked partner is removed in the
 * SAME operation, immediately. No orphaned data left for a partner
 * to keep viewing after someone has left.
 */
export function deleteAccountAndCascade({ userId }) {
  return request(`/account/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

/** Unlinking (without deleting the whole account) — same cascade rule applies. */
export function unlinkPartner({ userId }) {
  return request("/link/unlink", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function checkSubscriptionStatus({ userId }) {
  return request(`/subscription/${encodeURIComponent(userId)}`, { method: "GET" });
}
