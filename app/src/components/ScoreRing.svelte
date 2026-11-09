<script>
  /** Red arc at every percentage; the number is plain ink. null = no data. */
  let { score = null, size = 56 } = $props();
  const r = $derived(size / 2 - 6);
  const C = $derived(2 * Math.PI * r);
  const sw = $derived(size > 100 ? 7 : 4.5);
  const v = $derived(Math.max(0, Math.min(100, score ?? 0)));
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Execution score {score === null ? 'unavailable' : Math.round(score) + '%'}">
  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--empty)" stroke-width={sw} />
  <circle
    cx={size / 2} cy={size / 2} r={r} fill="none"
    stroke="var(--danger)" stroke-width={sw} stroke-linecap="round"
    stroke-dasharray="{(v / 100 * C).toFixed(1)} {C.toFixed(1)}"
    transform="rotate(-90 {size / 2} {size / 2})"
    style="transition: stroke-dasharray 0.5s var(--ease-out)"
  />
  <text x={size / 2} y={size / 2 + (size > 100 ? 10 : 6)} text-anchor="middle"
    fill={score === null ? "var(--ink-muted)" : "var(--ink)"}
    font-size={size > 100 ? 28 : 16} font-weight="700" font-family="var(--font-ui)" letter-spacing="-0.5">
    {score === null ? "–" : Math.round(score) + "%"}
  </text>
</svg>
