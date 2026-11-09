/**
 * Day84 Backend — Rate Limiting
 * ------------------------------------------------------------------
 * In-memory per-IP limiter. Fine for a single instance; swap the Map
 * for a shared store (Redis) if this is ever scaled horizontally.
 */

export function makeRateLimit({ max, windowMs, message }) {
  const hits = new Map(); // ip -> [timestamps]
  return function rateLimit(req, res, next) {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const existing = (hits.get(ip) || []).filter((t) => t > now - windowMs);
    if (existing.length >= max) {
      return res.status(429).json({ error: message || "Too many requests. Try again later." });
    }
    existing.push(now);
    hits.set(ip, existing);
    next();
  };
}

// 20 invite sends per IP per hour — protects the sending domain.
export const rateLimit = makeRateLimit({
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: "Too many invite requests. Try again later.",
});
