/**
 * Day84 — Dynamic Accent Color
 * ------------------------------------------------------------------
 * The app's one visual signature: the accent color is not a fixed
 * brand color. It's computed from cycle progress and pushed onto
 * the :root CSS variables, so the entire interface's "temperature"
 * shifts from cool and calm at the start of a 12-week cycle to
 * warm and urgent as the deadline approaches. This makes the
 * app's core idea (time pressure increasing) visible everywhere,
 * not just in one progress bar.
 *
 * Implementation note: we interpolate in HSL space across three
 * checkpoints rather than a flat two-color blend, so the shift
 * doesn't reach "alarming" red until the final stretch of the
 * cycle — the first 60% should still feel calm.
 */

const STOPS = [
  { pct: 0, h: 211, s: 90, l: 64 }, // calm blue
  { pct: 60, h: 211, s: 90, l: 64 }, // stays calm through the first 60%
  { pct: 85, h: 32, s: 95, l: 60 }, // amber — entering the final stretch
  { pct: 100, h: 4, s: 85, l: 58 }, // red — final days
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Returns { hex, soft, ink } for a given 0-100 cycle progress. */
export function accentForProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));

  let lower = STOPS[0];
  let upper = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].pct && clamped <= STOPS[i + 1].pct) {
      lower = STOPS[i];
      upper = STOPS[i + 1];
      break;
    }
  }

  const range = upper.pct - lower.pct;
  const t = range === 0 ? 0 : (clamped - lower.pct) / range;

  const h = lerp(lower.h, upper.h, t);
  const s = lerp(lower.s, upper.s, t);
  const l = lerp(lower.l, upper.l, t);

  const hex = hslToHex(h, s, l);
  return {
    hex,
    soft: hslToHex(h, Math.max(s - 20, 0), Math.min(l + 24, 92)),
    // Ink-on-accent: dark text reads fine on every stop in this range.
    ink: "#0d1117",
  };
}

/** Pushes the computed accent onto :root. Call on app load and
 *  whenever cycle progress meaningfully changes (e.g. once per day). */
export function applyAccentToDocument(pct) {
  const { hex, soft, ink } = accentForProgress(pct);
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty(
    "--accent-soft",
    soft.replace(
      /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i,
      (_, r, g, b) =>
        `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.16)`
    )
  );
  root.style.setProperty("--accent-ink", ink);
}
