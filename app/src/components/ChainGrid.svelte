<script>
  /** The Unbroken Chain: 84 square cells, 12 columns of 7 (one column per week). */
  let { days = [], cell = 18, gap = 5 } = $props();
  const cols = 12, rows = 7;
  const width = $derived(cols * cell + (cols - 1) * gap);
  const height = $derived(rows * cell + (rows - 1) * gap);
</script>

<svg viewBox="0 0 {width} {height}" width="100%" role="img" aria-label="84-day chain">
  {#each days as d, i}
    {@const col = Math.floor(i / rows)}
    {@const row = i % rows}
    <rect
      x={col * (cell + gap)} y={row * (cell + gap)} width={cell} height={cell} rx="2"
      fill={d.status === "done" ? "var(--ink)" : d.status === "miss" ? "transparent" : "var(--empty)"}
      stroke={d.status === "miss" ? "var(--danger)" : d.status === "today" ? "var(--ink-muted)" : "none"}
      stroke-width={d.status === "miss" || d.status === "today" ? 1.5 : 0}
      opacity={d.status === "future" ? 0.45 : 1}
    >
      <title>{d.key}: {d.status}</title>
    </rect>
  {/each}
</svg>

<style>
  svg { display: block; }
</style>
