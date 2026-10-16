import { Router } from "express";

const router = Router();

/**
 * STUB: in production this reads real entitlement state set by a
 * payment provider's webhook (RevenueCat, Stripe, App Store Server
 * Notifications, Google Play RTDN) — see docs/deployment-checklist.md
 * for exactly how to wire that in. For now this always reports
 * inactive; the frontend's Paywall screen simulates a successful
 * purchase locally so the rest of the gated UI is testable without
 * a live payment integration.
 */
router.get("/subscription/:userId", async (req, res) => {
  return res.json({ active: false, plan: null });
});

export default router;
