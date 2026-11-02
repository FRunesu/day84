import { Router } from "express";
import { generateInviteToken, expiryDate } from "../lib/auth.js";
import { sendInviteEmail } from "../lib/email.js";
import { createInvite, findInvitesByInviter, countLinksForUser, MAX_PARTNERS } from "../lib/db.js";
import { rateLimit } from "../lib/rateLimit.js";

const router = Router();

/**
 * Creates an invite. The invite code is returned to the INVITER so
 * they can share it directly (chat, in person) — the email, when
 * RESEND_API_KEY is configured, carries the same code plus the app
 * download link. Either way the recipient enters the code in-app.
 */
router.post("/invite", rateLimit, async (req, res) => {
  const { userId, userName, recipientEmail } = req.body;

  if (!userId || !userName || !recipientEmail) {
    return res.status(400).json({ error: "userId, userName, and recipientEmail are all required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: "That doesn't look like a valid email address." });
  }
  if ((await countLinksForUser(userId)) >= MAX_PARTNERS) {
    return res.status(400).json({ error: `You already have ${MAX_PARTNERS} partners.` });
  }

  const token = generateInviteToken();
  const invite = {
    id: token,
    token,
    inviterId: userId,
    inviterName: userName,
    recipientEmail,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: expiryDate(),
  };

  let emailed = false;
  try {
    const result = await sendInviteEmail({ inviterName: userName, token, recipientEmail });
    emailed = !!result?.sent;
  } catch (err) {
    console.error("[day84] invite email failed:", err.message);
  }
  invite.status = "sent";
  await createInvite(invite);
  return res.json({ inviteId: invite.id, inviteCode: token, status: "sent", emailed, expiresAt: invite.expiresAt });
});

/** The inviter's own invites, with current status (pending/sent/accepted). */
router.get("/invites/:userId", async (req, res) => {
  const invites = await findInvitesByInviter(req.params.userId);
  return res.json(
    invites.map((i) => ({
      id: i.id,
      inviteCode: i.token,
      recipientEmail: i.recipientEmail,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      acceptedBy: i.acceptedByName || null,
    }))
  );
});

export default router;
