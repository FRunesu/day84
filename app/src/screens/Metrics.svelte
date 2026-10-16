<script>
  import { tasksState } from "../stores/tasks.svelte.js";
  import { userState } from "../stores/user.svelte.js";
  import { todayStats, completionForDate } from "../lib/streaks.js";
  import { cycleDayKeys } from "../lib/time.js";
  import CompletionRing from "../components/CompletionRing.svelte";
  import Heatmap from "../components/Heatmap.svelte";

  const tasksStore = tasksState();
  const user = userState();

  // $derived means this is NEVER stale: it recomputes the instant
  // tasksStore.tasks/history changes anywhere in the app (e.g. a
  // task checked off on the Tasks screen) — stronger than the
  // spec's literal "recalculate on screen nav" requirement.
  const stats = $derived(todayStats(tasksStore.tasks, tasksStore.history));

  const completionByDate = $derived(
    (() => {
      if (!user.profile?.cycleStartDate) return {};
      const map = {};
      for (const key of cycleDayKeys(user.profile.cycleStartDate)) {
        map[key] = completionForDate(key, tasksStore.tasks, tasksStore.history);
      }
      return map;
    })()
  );

  const cycleAverage = $derived(
    (() => {
      const values = Object.values(completionByDate).filter((v) => v !== null);
      if (values.length === 0) return 0;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    })()
  );
</script>

<div class="metrics-screen">
  <header class="screen-header">
    <h1>Metrics</h1>
  </header>

  <section class="ring-section">
    <CompletionRing completed={stats.completed} total={stats.total} pct={stats.pct} />
  </section>

  <section class="heatmap-section">
    <div class="section-title-row">
      <h2>12-week momentum</h2>
      <span class="avg numeral">{cycleAverage}% avg</span>
    </div>
    {#if user.profile?.cycleStartDate}
      <Heatmap cycleStartDate={user.profile.cycleStartDate} {completionByDate} />
    {/if}
  </section>
</div>

<style>
  .metrics-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
  }

  h1 {
    font-size: var(--text-xl);
    margin: 0 0 var(--space-5) 0;
  }

  .ring-section {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
  }

  .heatmap-section {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
  }

  .section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--space-4);
  }

  h2 {
    font-size: var(--text-base);
    margin: 0;
    color: var(--ink);
  }

  .avg {
    font-size: var(--text-sm);
    color: var(--ink-muted);
  }
</style>
