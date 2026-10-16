import { Router } from "express";
import { findInviteByToken, updateInviteStatus, createLink, removeLinksForUser, deleteSharedData } from "../lib/db.js";
import { isUsable } from "../lib/auth.js";

const router = Router();

/** The recipient opening the invite link inside the app, completing the pairing. */
router.post("/link/accept", async (req, res) => {
  const { token, userId, userName } = req.body;
  if (!token || !userId) {
    return res.status(400).json({ error: "token and userId are required." });
  }

  const invite = await findInviteByToken(token);
  if (!isUsable(invite)) {
    return res.status(410).json({ error: "This invite link is invalid or has expired." });
  }
  if (invite.inviterId === userId) {
    return res.status(400).json({ error: "You can't link to your own invite." });
  }

  await createLink(invite.inviterId, userId);
  await updateInviteStatus(token, "accepted"); // single-use: can never be replayed after this

  return res.json({ partnerId: invite.inviterId, partnerName: invite.inviterName });
});

/**
 * Unlinking — per product rule, this clears what the (former)
 * partner can see immediately. We remove the link itself, which
 * means /sync/partner/:id will return nothing for either side from
 * this point on; we also proactively clear MY shared-data record so
 * even an in-flight request can't return stale data.
 */
router.post("/link/unlink", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  await removeLinksForUser(userId);
  await deleteSharedData(userId);

  return res.json({ unlinked: true });
});

export default router;
