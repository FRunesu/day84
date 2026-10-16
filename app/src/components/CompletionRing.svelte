<script>
  import { onDestroy } from "svelte";
  import { Chart, DoughnutController, ArcElement, Tooltip } from "chart.js";

  Chart.register(DoughnutController, ArcElement, Tooltip);

  let { completed = 0, total = 0, pct = 0, size = 220 } = $props();

  let canvasEl;
  let chart;

  function buildOrUpdate() {
    if (!canvasEl) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const track = getComputedStyle(document.documentElement).getPropertyValue("--border").trim();

    const data = {
      datasets: [
        {
          data: total === 0 ? [0, 1] : [completed, total - completed],
          backgroundColor: [accent, track],
          borderWidth: 0,
          borderRadius: 8,
          spacing: 3,
        },
      ],
    };

    if (chart) {
      chart.data = data;
      chart.update();
      return;
    }

    chart = new Chart(canvasEl, {
      type: "doughnut",
      data,
      options: {
        cutout: "78%",
        animation: { animateRotate: true, duration: 480 },
        plugins: { tooltip: { enabled: false }, legend: { display: false } },
        responsive: false,
      },
    });
  }

  $effect(() => {
    // re-run whenever completed/total/pct change
    completed;
    total;
    pct;
    buildOrUpdate();
  });

  onDestroy(() => {
    chart?.destroy();
  });
</script>

<div class="ring-wrap" style="width: {size}px; height: {size}px;">
  <canvas bind:this={canvasEl} width={size} height={size}></canvas>
  <div class="ring-center">
    <span class="numeral big">{pct.toFixed(0)}%</span>
    <span class="caption">today's execution</span>
    <span class="fraction numeral">{completed} / {total}</span>
  </div>
</div>

<style>
  .ring-wrap {
    position: relative;
    margin: 0 auto;
  }

  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    pointer-events: none;
  }

  .big {
    font-size: var(--text-4xl);
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
  }

  .caption {
    font-size: var(--text-xs);
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .fraction {
    font-size: var(--text-sm);
    color: var(--ink-faint);
    margin-top: 2px;
  }
</style>
