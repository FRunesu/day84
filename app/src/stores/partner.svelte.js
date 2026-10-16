/**
 * Day84 — Accountability Partner Store
 * ------------------------------------------------------------------
 * This is the freemium gate: the entire partner/sync feature lives
 * behind a subscription check (see hasFeatureAccess below). The
 * privacy model: sharePrefs default to OFF for goal/vision text and
 * ON for the bare streak number — but every field is user-controlled,
 * and the actual enforcement happens server-side (see backend), not
 * here. This store just reflects choices and displays the result.
 */

import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { defaultSharePrefs } from "../lib/schema.js";
import * as api from "../lib/api.js";

const PARTNER_KEY = "day84:partner";
const INVITES_KEY = "day84:invites";

let partnerLink = $state(null); // null = not linked to anyone
let sharePrefs = $state(defaultSharePrefs());
let invites = $state([]);
let partnerData = $state(null); // what THEY are sharing with ME
let subscriptionActive = $state(false);

export function partnerState() {
  return {
    get partnerLink() {
      return partnerLink;
    },
    get sharePrefs() {
      return sharePrefs;
    },
    get invites() {
      return invites;
    },
    get partnerData() {
      return partnerData;
    },
    get isLinked() {
      return !!partnerLink;
    },
    get subscriptionActive() {
      return subscriptionActive;
    },
  };
}

export async function loadPartnerState() {
  partnerLink = await storageGetJSON(PARTNER_KEY, null);
  invites = (await storageGetJSON(INVITES_KEY, [])) || [];
  if (partnerLink?.sharePrefs) sharePrefs = partnerLink.sharePrefs;
}

/** Gate for the whole feature — freemium boundary. */
export function hasFeatureAccess() {
  return subscriptionActive;
}

export function setSubscriptionActive(value) {
  subscriptionActive = value;
}

/**
 * Sends a real invite email containing a linking token AND a
 * download link to the app, per product requirement, so the
 * recipient can install Day84 and link in one flow.
 */
export async function sendPartnerInvite(userId, userName, recipientEmail) {
  const result = await api.sendInvite({ userId, userName, recipientEmail });
  const newInvite = {
    id: result.inviteId,
    recipientEmail,
    sentDate: new Date().toISOString(),
    status: result.status || "sent",
  };
  invites = [...invites, newInvite];
  await storageSetJSON(INVITES_KEY, invites);
  return newInvite;
}

export async function acceptPartnerInvite(token, userId, userName) {
  const result = await api.acceptInvite({ token, userId, userName });
  partnerLink = {
    partnerId: result.partnerId,
    partnerName: result.partnerName,
    linkedDate: new Date().toISOString(),
    sharePrefs,
  };
  await storageSetJSON(PARTNER_KEY, partnerLink);
  return partnerLink;
}

export async function updateSharePrefs(patch) {
  sharePrefs = { ...sharePrefs, ...patch };
  if (partnerLink) {
    partnerLink = { ...partnerLink, sharePrefs };
    await storageSetJSON(PARTNER_KEY, partnerLink);
  }
}

/** Pushes my current opted-in fields to the server for my partner to read. */
export async function syncSharedData(userId, { streak, cycleProgressPct, goalText, visionText }) {
  if (!partnerLink) return;
  await api.pushSharedData({
    userId,
    sharePrefs,
    streaks: streak,
    cycleProgress: cycleProgressPct,
    goalText,
    visionText,
  });
}

export async function refreshPartnerData(userId) {
  if (!partnerLink) {
    partnerData = null;
    return null;
  }
  partnerData = await api.fetchPartnerData({ userId });
  return partnerData;
}

/**
 * Unlinking — per product rule, this immediately clears what the
 * partner can see too (enforced server-side), not just locally.
 */
export async function unlinkPartner(userId) {
  await api.unlinkPartner({ userId });
  partnerLink = null;
  partnerData = null;
  await storageRemove(PARTNER_KEY);
}

/**
 * Full account deletion cascade — called from Settings. The backend
 * call removes shared data from the partner's view in the SAME
 * operation; this just clears the local mirror of that state.
 */
export async function deleteAccountCascade(userId) {
  await api.deleteAccountAndCascade({ userId });
  partnerLink = null;
  partnerData = null;
  invites = [];
  await storageRemove(PARTNER_KEY);
  await storageRemove(INVITES_KEY);
}
