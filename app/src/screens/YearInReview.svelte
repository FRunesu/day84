<script>
  import { cycleReviewState } from "../stores/cycleReview.svelte.js";
  import { goalsState } from "../stores/goals.svelte.js";
  import { identityState } from "../stores/identity.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";
  import { computeAnnualWrap } from "../lib/annualWrap.js";

  const cr = cycleReviewState();
  const gs = goalsState();
  const id = identityState();

  const year = new Date().getFullYear();

  const wrap = $derived(computeAnnualWrap(cr.reviews, gs.tactics, gs.completions, year));
</script>

<div class="year-screen">
  <header class="screen-header">
    <button class="back-btn" onclick={() => showScreen(SCREENS.SETTINGS)}>← Back</button>
    <h1>{year} In Review</h1>
  </header>

  <div class="cards">
    <!-- Identity -->
    {#if id.statement}
      <div class="card accent-card">
        <span class="card-label">My Identity</span>
        <p class="card-value-text">I am a person who… {id.statement}</p>
      </div>
    {/if}

    <!-- Core stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num numeral">{wrap.cyclesCompleted}</span>
        <span class="stat-label">cycles completed</span>
      </div>
      <div class="stat-card">
        <span class="stat-num numeral" style="color:{wrap.avgWeeklyScore>=80?'var(--success)':wrap.avgWeeklyScore>=60?'var(--warning)':'var(--danger)'}">
          {wrap.avgWeeklyScore}%
        </span>
        <span class="stat-label">avg. execution</span>
      </div>
      <div class="stat-card">
        <span class="stat-num numeral">{wrap.totalCompleted}</span>
        <span class="stat-label">tactics completed</span>
      </div>
    </div>

    <!-- Best week -->
    {#if wrap.bestWeek}
      <div class="card">
        <span class="card-label">Best Week</span>
        <span class="card-value numeral">{wrap.bestWeek.score}%</span>
        <span class="card-sub">Week {wrap.bestWeek.week}</span>
      </div>
    {/if}

    <!-- Goals -->
    <div class="card">
      <span class="card-label">Goals</span>
      <span class="card-value numeral">{wrap.goalsAchieved} <span class="card-denom">/ {wrap.goalsSet}</span></span>
      <span class="card-sub">achieved</span>
    </div>

    <!-- Most consistent -->
    {#if wrap.mostConsistentTactic}
      <div class="card">
        <span class="card-label">Most Consistent Tactic</span>
        <span class="card-value-text">{wrap.mostConsistentTactic.name}</span>
        <span class="card-sub">{wrap.mostConsistentTactic.count} completions</span>
      </div>
    {/if}

    <!-- Score chart -->
    {#if wrap.weeklyScoreData.length > 0}
      <div class="card">
        <span class="card-label">Weekly Scores</span>
        <div class="mini-chart">
          {#each wrap.weeklyScoreData as w}
            <div
              class="mini-bar"
              style="height:{Math.min(100,w.score)}%;background:{w.score>=80?'var(--success)':w.score>=60?'var(--warning)':'var(--danger)'}"
              title="Week {w.week}: {w.score}%"
            ></div>
          {/each}
        </div>
      </div>
    {/if}

    {#if wrap.cyclesCompleted === 0}
      <div class="empty-wrap">
        <p>Complete your first 12-week cycle to see your {year} wrap.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .year-screen { padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) var(--space-8); display: flex; flex-direction: column; gap: var(--space-5); }
  .screen-header { display: flex; align-items: center; gap: var(--space-4); }
  h1 { font-size: var(--text-xl); margin: 0; }
  .back-btn { color: var(--ink-muted); font-size: var(--text-sm); }

  .cards { display: flex; flex-direction: column; gap: var(--space-4); }
  .card {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2);
  }
  .accent-card { border-color: var(--accent); background: var(--accent-soft); }
  .card-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-faint); }
  .card-value { font-size: var(--text-4xl); font-weight: 700; color: var(--ink); line-height: 1; }
  .card-denom { font-size: var(--text-2xl); color: var(--ink-muted); }
  .card-value-text { font-size: var(--text-base); color: var(--ink); font-style: italic; line-height: 1.5; }
  .card-sub { font-size: var(--text-sm); color: var(--ink-muted); }

  .stats-row { display: flex; gap: var(--space-3); }
  .stat-card {
    flex: 1; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: var(--space-4); display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center;
  }
  .stat-num { font-size: var(--text-2xl); font-weight: 700; color: var(--ink); line-height: 1; }
  .stat-label { font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.04em; }

  .mini-chart { display: flex; gap: 3px; align-items: flex-end; height: 60px; margin-top: var(--space-2); }
  .mini-bar { flex: 1; border-radius: 2px 2px 0 0; min-height: 2px; }

  .empty-wrap { text-align: center; padding: var(--space-6); color: var(--ink-muted); font-size: var(--text-sm); }
</style>
