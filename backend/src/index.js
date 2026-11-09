/**
 * Day84 Backend — Entry Point
 * ------------------------------------------------------------------
 * This is the ONLY server Day84 needs. It does exactly four jobs:
 *   1. Send accountability-invite emails (with a download link)
 *   2. Link accounts together when an invite is accepted (up to 6 partners each)
 *   3. Sync the narrow set of fields a user has opted to share,
 *      filtered server-side by THEIR privacy choices
 *   4. Deliver "Push" nudges between linked partners
 *   5. Delete an account, cascading that deletion to anything a
 *      partner could see
 *
 * Everything else in Day84 — tasks, streaks, the time dashboard,
 * both charts — works fully offline with no server involved at all.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";

import inviteRoutes from "./routes/invite.js";
import linkRoutes from "./routes/link.js";
import syncRoutes from "./routes/sync.js";
import accountRoutes from "./routes/account.js";
import subscriptionRoutes from "./routes/subscription.js";
import pushRoutes from "./routes/push.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.set("etag", false);
app.use(cors());
app.use(express.json());
app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

// Basic request log — replace with a real logger (pino, winston) in production.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "day84-backend" }));

app.use(inviteRoutes);
app.use(linkRoutes);
app.use(syncRoutes);
app.use(accountRoutes);
app.use(subscriptionRoutes);
app.use(pushRoutes);

app.use((err, _req, res, _next) => {
  console.error("[day84] unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

app.listen(PORT, () => {
  console.log(`Day84 backend listening on http://localhost:${PORT}`);
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠ RESEND_API_KEY not set — invite emails will be logged to this console instead of actually sent. See .env.example.");
  }
});
