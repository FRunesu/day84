import { Router } from "express";
import {
  findInviteByToken, updateInviteStatus, createLink, removeLink, removeLinksForUser,
  deleteSharedData, countLinksForUser, findLinksForUser, MAX_PARTNERS,
} from "../lib/db.js";
import { isUsable } from "../lib/auth.js";

const router = Router();

/** The recipient entering the invite code in-app, completing the pairing. */
router.post("/link/accept", async (req, res) => {
  const { token, userId, userName } = req.body;
  if (!token || !userId) {
    return res.status(400).json({ error: "token and userId are required." });
  }

  const invite = await findInviteByToken(String(token).trim());
  if (!isUsable(invite)) {
    return res.status(410).json({ error: "This invite code is invalid, already used, or has expired." });
  }
  if (invite.inviterId === userId) {
    return res.status(400).json({ error: "You can't link to your own invite." });
  }
  const existing = await findLinksForUser(userId);
  if (existing.some((l) => l.userAId === invite.inviterId || l.userBId === invite.inviterId)) {
    return res.status(400).json({ error: `You're already linked with ${invite.inviterName}.` });
  }
  if (existing.length >= MAX_PARTNERS) {
    return res.status(400).json({ error: `You already have ${MAX_PARTNERS} partners.` });
  }
  if ((await countLinksForUser(invite.inviterId)) >= MAX_PARTNERS) {
    return res.status(400).json({ error: `${invite.inviterName} already has ${MAX_PARTNERS} partners.` });
  }

  await createLink({ id: invite.inviterId, name: invite.inviterName }, { id: userId, name: userName || "Partner" });
  await updateInviteStatus(invite.token, "accepted", { acceptedById: userId, acceptedByName: userName || "Partner" });

  return res.json({ partnerId: invite.inviterId, partnerName: invite.inviterName });
});

/**
 * Unlink one partner (partnerId given) or everyone (no partnerId).
 * Takes effect immediately for both sides: the link row is gone, so
 * /sync/partners returns nothing about the other person from now on.
 */
router.post("/link/unlink", async (req, res) => {
  const { userId, partnerId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  if (partnerId) {
    await removeLink(userId, partnerId);
  } else {
    await removeLinksForUser(userId);
    await deleteSharedData(userId);
  }
  return res.json({ unlinked: true });
});

export default router;
