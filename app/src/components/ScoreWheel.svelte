<script>
  let { score = 0, planned = 0, completed = 0, size = 200 } = $props();

  const r = 70;
  const sw = 14;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const color = $derived(
    score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--danger)"
  );
  const offset = $derived(circumference * (1 - Math.min(100, score) / 100));
  const label = $derived(
    score >= 80 ? "On Track" : score >= 60 ? "Push Harder" : "Danger Zone"
  );
</script>

<div class="wheel-wrap" style="width:{size}px;height:{size}px;">
  <svg viewBox="0 0 {size} {size}" width={size} height={size} role="img" aria-label="Execution score {score}%">
    <!-- track -->
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface)" stroke-width={sw} />
    <!-- filled arc -->
    <circle
      cx={cx} cy={cy} r={r}
      fill="none"
      stroke={color}
      stroke-width={sw}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      transform="rotate(-90 {cx} {cy})"
      style="transition: stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1), stroke 0.4s ease"
    />
  </svg>
  <div class="wheel-center">
    <span class="numeral score-num">{score.toFixed(0)}<span class="pct-sign">%</span></span>
    <span class="score-label" style="color:{color}">{label}</span>
    <span class="score-sub">{completed} / {planned} tactics</span>
  </div>
</div>

<style>
  .wheel-wrap {
    position: relative;
    margin: 0 auto;
    flex-shrink: 0;
  }
  svg { display: block; }
  .wheel-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    gap: 2px;
  }
  .score-num {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
  }
  .pct-sign { font-size: var(--text-xl); }
  .score-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .score-sub {
    font-size: var(--text-xs);
    color: var(--ink-faint);
  }
</style>
