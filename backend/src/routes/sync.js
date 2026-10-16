import { Router } from "express";
import { upsertSharedData, getSharedData, findLinkForUser, partnerIdFromLink } from "../lib/db.js";

const router = Router();

/**
 * I push my full current state + my sharePrefs choices. Storing the
 * unfiltered data here is fine — the filtering happens on READ
 * (below), based on the OWNER's sharePrefs, not the reader's.
 */
router.post("/sync/push", async (req, res) => {
  const { userId, sharePrefs, streaks, cycleProgress, goalText, visionText } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const saved = await upsertSharedData(userId, { sharePrefs, streaks, cycleProgress, goalText, visionText });
  return res.json({ saved: true, updatedAt: saved.updatedAt });
});

/**
 * THIS is the privacy enforcement point referenced throughout the
 * spec: a field the owner has not opted to share is simply never
 * included in the response — not sent-then-hidden client-side. A
 * technically curious partner inspecting network traffic sees
 * exactly what they're allowed to see, nothing more.
 */
router.get("/sync/partner/:userId", async (req, res) => {
  const { userId } = req.params;

  const link = await findLinkForUser(userId);
  if (!link) {
    return res.json({}); // not linked to anyone — nothing to show
  }

  const partnerId = partnerIdFromLink(link, userId);
  const partnerData = await getSharedData(partnerId);
  if (!partnerData) {
    return res.json({});
  }

  const prefs = partnerData.sharePrefs || {};
  const filtered = {};
  if (prefs.shareStreaks) filtered.streaks = partnerData.streaks;
  if (prefs.shareCycleProgress) filtered.cycleProgress = partnerData.cycleProgress;
  if (prefs.shareGoalText) filtered.goalText = partnerData.goalText;
  if (prefs.shareVisionText) filtered.visionText = partnerData.visionText;

  return res.json(filtered);
});

export default router;
