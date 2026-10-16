import { Router } from "express";
import { generateInviteToken, expiryDate } from "../lib/auth.js";
import { sendInviteEmail } from "../lib/email.js";
import { createInvite } from "../lib/db.js";
import { rateLimit } from "../lib/rateLimit.js";

const router = Router();

router.post("/invite", rateLimit, async (req, res) => {
  const { userId, userName, recipientEmail } = req.body;

  if (!userId || !userName || !recipientEmail) {
    return res.status(400).json({ error: "userId, userName, and recipientEmail are all required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: "That doesn't look like a valid email address." });
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

  try {
    await sendInviteEmail({ inviterName: userName, token, recipientEmail });
    invite.status = "sent";
    await createInvite(invite);
    return res.json({ inviteId: invite.id, status: "sent" });
  } catch (err) {
    invite.status = "failed";
    await createInvite(invite);
    console.error("[day84] invite send failed:", err.message);
    return res.status(502).json({ error: "Couldn't send that invite email. Please try again." });
  }
});

export default router;
