<script>
  let { label, percent = 0, sublabel = "" } = $props();
</script>

<div class="bar-row">
  <div class="bar-row-top">
    <span class="label">{label}</span>
    <span class="pct numeral">{Math.round(percent)}%</span>
  </div>
  <div class="track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
    <div class="fill" style="width: {Math.min(100, Math.max(0, percent))}%"></div>
  </div>
  {#if sublabel}
    <span class="sublabel">{sublabel}</span>
  {/if}
</div>

<style>
  .bar-row { display: flex; flex-direction: column; gap: var(--space-2); }
  .bar-row-top { display: flex; justify-content: space-between; align-items: baseline; }
  .label { font-size: var(--text-sm); color: var(--ink-muted); font-weight: 500; }
  .pct { font-size: var(--text-sm); color: var(--ink); font-weight: 600; }
  .track {
    height: 8px; border-radius: var(--radius-full);
    background: var(--surface); border: 1px solid var(--border); overflow: hidden;
  }
  .fill {
    height: 100%; background: var(--accent); border-radius: var(--radius-full);
    transition: width var(--duration-slow) var(--ease-out), background var(--duration-slow) var(--ease-out);
  }
  .sublabel { font-size: var(--text-xs); color: var(--ink-faint); }
</style>
