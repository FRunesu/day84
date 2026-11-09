import { Router } from "express";
import { findLinksForUser, partnerFromLink, createPush, takePushesFor, recentPushCount, getSharedData } from "../lib/db.js";
import { nanoid } from "nanoid";

const router = Router();

const PUSH_WINDOW_MS = 60 * 60 * 1000;
const PUSHES_PER_HOUR = 3;

/** "Push <partner>": a nudge that shows up in the partner's app. */
router.post("/push", async (req, res) => {
  const { fromId, toId } = req.body;
  if (!fromId || !toId) return res.status(400).json({ error: "fromId and toId are required." });

  const links = await findLinksForUser(fromId);
  const link = links.find((l) => partnerFromLink(l, fromId).id === toId);
  if (!link) return res.status(403).json({ error: "You're not linked with that person." });

  if ((await recentPushCount(fromId, toId, PUSH_WINDOW_MS)) >= PUSHES_PER_HOUR) {
    return res.status(429).json({ error: "You've already pushed them recently. Give it an hour." });
  }

  const me = await getSharedData(fromId);
  const fromName = me?.userName || partnerFromLink(link, toId).name;
  const push = { id: nanoid(12), fromId, fromName, toId, createdAt: new Date().toISOString() };
  await createPush(push);
  return res.json({ sent: true, id: push.id });
});

/** Pending pushes for me; delivered once, then removed. */
router.get("/push/:userId", async (req, res) => {
  const pushes = await takePushesFor(req.params.userId);
  return res.json(pushes.map(({ id, fromId, fromName, createdAt }) => ({ id, fromId, fromName, createdAt })));
});

export default router;
