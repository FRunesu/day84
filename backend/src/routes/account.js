import { Router } from "express";
import { deleteAccountCascade } from "../lib/db.js";

const router = Router();

/**
 * Per explicit product rule: deleting an account removes the
 * user's own shared data AND breaks/clears their partner link in
 * the SAME operation — no orphaned data left for a (former)
 * partner to keep viewing after someone has left. See db.js for
 * the actual cascade implementation.
 */
router.delete("/account/:userId", async (req, res) => {
  const { userId } = req.params;
  await deleteAccountCascade(userId);
  return res.json({ deleted: true });
});

export default router;
