<script>
  /**
   * Renders one cell per day across the full 84-day cycle (12 rows
   * of 7, like a calendar). Color intensity = that day's completion
   * %. This replaces the spec's original separate "7-day line chart"
   * and "12-week bar chart": the last 7 cells ARE the weekly view,
   * and the full grid shows consistency PATTERNS (gaps, streak runs)
   * that an averaged line/bar can't — which matters more for a
   * habit app than a smoothed trend.
   */
  import { cycleDayKeys } from "../lib/time.js";

  let { cycleStartDate, completionByDate = {}, cellSize = 13, gap = 4 } = $props();

  const dayKeys = $derived(cycleDayKeys(cycleStartDate));
  const todayKey = $derived(
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })()
  );

  function colorFor(pct) {
    if (pct === null || pct === undefined) return "var(--surface)"; // future / no data
    if (pct === 0) return "var(--danger-soft)";
    if (pct < 50) return "color-mix(in srgb, var(--accent) 35%, var(--surface))";
    if (pct < 100) return "color-mix(in srgb, var(--accent) 65%, var(--surface))";
    return "var(--accent)";
  }

  const cols = 12; // 12 weeks across
  const rows = 7; // 7 days down — Mon..Sun per column
  const width = $derived(cols * cellSize + (cols - 1) * gap);
  const height = $derived(rows * cellSize + (rows - 1) * gap);
</script>

<div class="heatmap-wrap">
  <svg viewBox="0 0 {width} {height}" width="100%" height={height} role="img" aria-label="12-week completion heatmap">
    {#each dayKeys as key, i}
      {@const col = Math.floor(i / rows)}
      {@const row = i % rows}
      {@const pct = completionByDate[key] ?? null}
      {@const isFuture = key > todayKey}
      <rect
        x={col * (cellSize + gap)}
        y={row * (cellSize + gap)}
        width={cellSize}
        height={cellSize}
        rx="3"
        fill={isFuture ? "var(--surface)" : colorFor(pct)}
        stroke={key === todayKey ? "var(--accent)" : "transparent"}
        stroke-width={key === todayKey ? 1.5 : 0}
      >
        <title>{key}{pct !== null ? `: ${pct}% complete` : isFuture ? ": upcoming" : ": no tasks logged"}</title>
      </rect>
    {/each}
  </svg>

  <div class="legend">
    <span class="legend-label">Less</span>
    <span class="swatch" style="background: var(--danger-soft)"></span>
    <span class="swatch" style="background: color-mix(in srgb, var(--accent) 35%, var(--surface))"></span>
    <span class="swatch" style="background: color-mix(in srgb, var(--accent) 65%, var(--surface))"></span>
    <span class="swatch" style="background: var(--accent)"></span>
    <span class="legend-label">More</span>
  </div>
</div>

<style>
  .heatmap-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  svg {
    display: block;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: flex-end;
  }

  .legend-label {
    font-size: var(--text-xs);
    color: var(--ink-faint);
    margin: 0 4px;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
</style>
