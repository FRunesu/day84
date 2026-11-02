import { Router } from "express";
import { upsertSharedData, getSharedData, findLinksForUser, partnerFromLink } from "../lib/db.js";

const router = Router();

/**
 * I push my full current state + my sharePrefs choices. Storing the
 * unfiltered data is fine — filtering happens on READ, based on the
 * OWNER's sharePrefs, not the reader's.
 */
router.post("/sync/push", async (req, res) => {
  const { userId, userName, sharePrefs, streaks, bestStreak, dayScore, dayPlanned, dayCompleted, cycleProgress, cycleDay, goalText, visionText } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const saved = await upsertSharedData(userId, {
    userName, sharePrefs, streaks, bestStreak, dayScore, dayPlanned, dayCompleted, cycleProgress, cycleDay, goalText, visionText,
  });
  return res.json({ saved: true, updatedAt: saved.updatedAt });
});

/** Only the fields the owner opted to share ever leave the server. */
function filterShared(data) {
  if (!data) return { updatedAt: null };
  const prefs = data.sharePrefs || {};
  const out = {
    // Today's execution score is the one thing every partner always sees.
    dayScore: data.dayScore ?? null,
    dayPlanned: data.dayPlanned ?? null,
    dayCompleted: data.dayCompleted ?? null,
    updatedAt: data.updatedAt,
  };
  if (prefs.shareStreaks) { out.streaks = data.streaks ?? 0; out.bestStreak = data.bestStreak ?? 0; }
  if (prefs.shareCycleProgress) { out.cycleProgress = data.cycleProgress ?? 0; out.cycleDay = data.cycleDay ?? null; }
  if (prefs.shareGoalText) out.goalText = data.goalText ?? "";
  if (prefs.shareVisionText) out.visionText = data.visionText ?? "";
  return out;
}

/** Everyone I'm linked with, each with whatever they share with me. */
router.get("/sync/partners/:userId", async (req, res) => {
  const { userId } = req.params;
  const links = await findLinksForUser(userId);
  const partners = [];
  for (const link of links) {
    const p = partnerFromLink(link, userId);
    const data = await getSharedData(p.id);
    partners.push({
      partnerId: p.id,
      partnerName: data?.userName || p.name,
      linkedDate: link.createdAt,
      data: filterShared(data),
    });
  }
  return res.json(partners);
});

export default router;
