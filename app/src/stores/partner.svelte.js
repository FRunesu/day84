/**
 * Day84 — Accountability Partners Store
 * ------------------------------------------------------------------
 * Up to MAX_PARTNERS linked partners. The server is the source of
 * truth for who you're linked with and what they share; this store
 * keeps a local mirror so the Home screen renders instantly and
 * still shows the last-known state offline.
 *
 * Privacy: sharePrefs default to OFF for goal/vision text and ON for
 * streaks and cycle progress. Enforcement is server-side.
 */

import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { defaultSharePrefs } from "../lib/schema.js";
import * as api from "../lib/api.js";

export const MAX_PARTNERS = 6;

const PARTNERS_KEY = "day84:partners";
const INVITES_KEY = "day84:invites";
const SHARE_PREFS_KEY = "day84:sharePrefs";
const SUBSCRIPTION_KEY = "day84:subscription";
const LEGACY_PARTNER_KEY = "day84:partner";

let partners = $state([]); // [{ partnerId, partnerName, linkedDate, data }]
let sharePrefs = $state(defaultSharePrefs());
let invites = $state([]); // [{ id, inviteCode, recipientEmail, sentDate, status, acceptedBy }]
let pushes = $state([]); // nudges received: [{ id, fromId, fromName, createdAt }]
let subscriptionActive = $state(false);
let lastSyncError = $state("");
let selectedPartnerId = $state(null);

export function partnerState() {
  return {
    get partners() { return partners; },
    get sharePrefs() { return sharePrefs; },
    get invites() { return invites; },
    get pushes() { return pushes; },
    get isLinked() { return partners.length > 0; },
    get canAddMore() { return partners.length < MAX_PARTNERS; },
    get subscriptionActive() { return subscriptionActive; },
    get lastSyncError() { return lastSyncError; },
    get selectedPartnerId() { return selectedPartnerId; },
    get selectedPartner() { return partners.find((p) => p.partnerId === selectedPartnerId) || null; },
  };
}

export async function loadPartnerState() {
  await api.loadApiBase();
  partners = (await storageGetJSON(PARTNERS_KEY, [])) || [];
  invites = (await storageGetJSON(INVITES_KEY, [])) || [];
  sharePrefs = { ...defaultSharePrefs(), ...((await storageGetJSON(SHARE_PREFS_KEY, null)) || {}) };
  subscriptionActive = !!(await storageGetJSON(SUBSCRIPTION_KEY, false));

  // Migrate the old single-partner record, if present.
  const legacy = await storageGetJSON(LEGACY_PARTNER_KEY, null);
  if (legacy?.partnerId && !partners.some((p) => p.partnerId === legacy.partnerId)) {
    partners = [...partners, { partnerId: legacy.partnerId, partnerName: legacy.partnerName, linkedDate: legacy.linkedDate, data: {} }];
    if (legacy.sharePrefs) sharePrefs = { ...sharePrefs, ...legacy.sharePrefs };
    await storageSetJSON(PARTNERS_KEY, partners);
    await storageSetJSON(SHARE_PREFS_KEY, sharePrefs);
    await storageRemove(LEGACY_PARTNER_KEY);
  }
}

/** Gate for the whole feature — freemium boundary. */
export function hasFeatureAccess() {
  return subscriptionActive;
}

export async function setSubscriptionActive(value) {
  subscriptionActive = !!value;
  await storageSetJSON(SUBSCRIPTION_KEY, subscriptionActive);
}

export function selectPartner(partnerId) {
  selectedPartnerId = partnerId;
}

/**
 * Creates an invite. The returned invite code can be shared directly;
 * the server also emails it when email sending is configured.
 */
export async function sendPartnerInvite(userId, userName, recipientEmail) {
  const result = await api.sendInvite({ userId, userName, recipientEmail });
  const newInvite = {
    id: result.inviteId,
    inviteCode: result.inviteCode,
    recipientEmail,
    sentDate: new Date().toISOString(),
    status: result.status || "sent",
    emailed: !!result.emailed,
    acceptedBy: null,
  };
  invites = [...invites, newInvite];
  await storageSetJSON(INVITES_KEY, invites);
  return newInvite;
}

export async function acceptPartnerInvite(token, userId, userName) {
  const result = await api.acceptInvite({ token, userId, userName });
  if (!partners.some((p) => p.partnerId === result.partnerId)) {
    partners = [...partners, { partnerId: result.partnerId, partnerName: result.partnerName, linkedDate: new Date().toISOString(), data: {} }];
    await storageSetJSON(PARTNERS_KEY, partners);
  }
  return result;
}

export async function updateSharePrefs(patch) {
  sharePrefs = { ...sharePrefs, ...patch };
  await storageSetJSON(SHARE_PREFS_KEY, sharePrefs);
}

/** Pushes my current opted-in fields to the server for partners to read. */
export async function syncSharedData(userId, payload) {
  if (!userId || !subscriptionActive) return;
  try {
    await api.pushSharedData({ userId, sharePrefs, ...payload });
    lastSyncError = "";
  } catch (err) {
    lastSyncError = err.message;
  }
}

/** Pulls partners (+ what they share), my invite statuses and any pushes. */
export async function refreshPartners(userId) {
  if (!userId || !subscriptionActive) return partners;
  try {
    const [remote, remoteInvites, incoming] = await Promise.all([
      api.fetchPartners({ userId }),
      api.fetchInvites({ userId }).catch(() => null),
      api.fetchPushes({ userId }).catch(() => []),
    ]);
    partners = remote.map((r) => ({
      partnerId: r.partnerId,
      partnerName: r.partnerName,
      linkedDate: r.linkedDate,
      data: r.data || {},
    }));
    await storageSetJSON(PARTNERS_KEY, partners);

    if (remoteInvites) {
      const byId = new Map(remoteInvites.map((i) => [i.id, i]));
      invites = invites.map((i) => {
        const r = byId.get(i.id);
        return r ? { ...i, status: r.status, acceptedBy: r.acceptedBy, inviteCode: i.inviteCode || r.inviteCode } : i;
      });
      await storageSetJSON(INVITES_KEY, invites);
    }

    if (incoming.length) pushes = [...pushes, ...incoming];
    lastSyncError = "";
  } catch (err) {
    lastSyncError = err.message;
  }
  return partners;
}

export async function pushPartner(userId, partnerId) {
  return api.sendPush({ fromId: userId, toId: partnerId });
}

export function dismissPush(id) {
  pushes = pushes.filter((p) => p.id !== id);
}

/** Unlinking takes effect for both sides immediately (server-side). */
export async function unlinkPartner(userId, partnerId) {
  await api.unlinkPartner({ userId, partnerId });
  partners = partners.filter((p) => p.partnerId !== partnerId);
  if (selectedPartnerId === partnerId) selectedPartnerId = null;
  await storageSetJSON(PARTNERS_KEY, partners);
}

/** Full account deletion cascade — called from Settings. */
export async function deleteAccountCascade(userId) {
  await api.deleteAccountAndCascade({ userId });
  partners = [];
  invites = [];
  pushes = [];
  await storageRemove(PARTNERS_KEY);
  await storageRemove(INVITES_KEY);
}
