/**
 * Anvil Backend — Data Layer
 * ------------------------------------------------------------------
 * Postgres when DATABASE_URL is set (production), otherwise a local
 * JSON file (zero-setup development). Both modules export the same
 * functions.
 */

const store = process.env.DATABASE_URL ? await import("./db-pg.js") : await import("./db-json.js");

export const {
  MAX_PARTNERS,
  createInvite, findInviteByToken, findInvitesByInviter, updateInviteStatus,
  createLink, findLinksForUser, countLinksForUser, removeLink, removeLinksForUser, partnerFromLink,
  upsertSharedData, getSharedData, deleteSharedData,
  createPush, takePushesFor, recentPushCount,
  deleteAccountCascade,
} = store;
