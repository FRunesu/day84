/**
 * Day84 Backend — Rate Limiting
 * ------------------------------------------------------------------
 * Per the security checklist: the invite-sending endpoint must be
 * rate-limited, or it becomes an open door for someone to spam
 * arbitrary email addresses through Day84's sending domain — which
 * gets that domain blacklisted by email providers, independent of
 * any direct cost.
 *
 * This is an in-memory limiter, which is fine for a single backend
 * instance. If this is ever deployed across multiple instances
 * (horizontal scaling), swap the Map below for a shared store
 * (e.g. Redis) so limits are enforced globally, not per-instance.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5; // 5 invite sends per IP per hour

const hits = new Map(); // ip -> [timestamps]

export function rateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const existing = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (existing.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many invite requests. Try again later." });
  }

  existing.push(now);
  hits.set(ip, existing);
  next();
}
