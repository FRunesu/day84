<script>
  import { periodState, restartPeriod } from "../stores/period.svelte.js";
  import { goalsState } from "../stores/goals.svelte.js";
  import { saveCycleReview } from "../stores/cycleReview.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";
  import { allWeekScores } from "../lib/weeklyScore.js";

  const per = periodState();
  const gs = goalsState();

  let notes = $state("");
  let goalReflections = $state(
    gs.goals.map(g => ({ goalId: g.id, title: g.title, achieved: false, notes: "" }))
  );
  let saving = $state(false);

  const weekScores = $derived(
    per.period ? allWeekScores(gs.tactics, gs.completions, per.period.startDate) : []
  );

  const avgScore = $derived(() => {
    const scores = weekScores.filter(w => w.planned > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  });

  async function handleSave() {
    saving = true;
    await saveCycleReview({
      periodId: per.period?.id,
      periodName: per.period?.name ?? "",
      weeklyScores: weekScores,
      goalReflections,
      notes,
    });
    await restartPeriod();
    saving = false;
    showScreen(SCREENS.DASHBOARD);
  }
</script>

<div class="review-screen">
  <header class="screen-header">
    <button class="back-btn" onclick={() => showScreen(SCREENS.SETTINGS)}>← Back</button>
    <h1>Cycle Review</h1>
  </header>

  <p class="sub">Review what you accomplished before starting the next 12 weeks.</p>

  <!-- Score summary -->
  <div class="score-summary">
    <div class="summary-stat">
      <span class="stat-num numeral">{avgScore()}%</span>
      <span class="stat-label">Average weekly score</span>
    </div>
    <div class="week-scores">
      {#each weekScores as w}
        <div class="week-bar" title="Week {w.week}: {Math.round(w.score)}%">
          <div
            class="week-fill"
            style="height:{Math.min(100,w.score)}%;background:{w.score>=80?'var(--success)':w.score>=60?'var(--warning)':'var(--danger)'}"
          ></div>
          <span class="week-num numeral">{w.week}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Goals -->
  <section class="goal-reflections">
    <h2>Goals — did you achieve them?</h2>
    {#each goalReflections as ref, i}
      <div class="goal-ref-card">
        <label class="goal-ref-check">
          <input type="checkbox" bind:checked={goalReflections[i].achieved} />
          <span class="goal-ref-title">{ref.title}</span>
        </label>
        <textarea rows="2" bind:value={goalReflections[i].notes} placeholder="Notes on this goal (optional)"></textarea>
      </div>
    {/each}
  </section>

  <!-- Overall notes -->
  <section class="notes-section">
    <h2>Overall reflection</h2>
    <textarea rows="5" bind:value={notes} placeholder="What did you learn? What will you do differently next cycle?"></textarea>
  </section>

  <button class="save-btn" disabled={saving} onclick={handleSave}>
    {saving ? "Saving…" : "Save review & start new cycle"}
  </button>
</div>

<style>
  .review-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) var(--space-8);
    display: flex; flex-direction: column; gap: var(--space-5);
  }
  .screen-header { display: flex; align-items: center; gap: var(--space-4); }
  h1 { font-size: var(--text-xl); margin: 0; }
  h2 { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-muted); margin: 0 0 var(--space-3) 0; }
  .back-btn { color: var(--accent); font-size: var(--text-sm); flex-shrink: 0; }
  .sub { font-size: var(--text-sm); color: var(--ink-muted); margin: 0; }

  .score-summary { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-5); }
  .summary-stat { text-align: center; margin-bottom: var(--space-4); }
  .stat-num { font-size: var(--text-3xl); font-weight: 700; display: block; }
  .stat-label { font-size: var(--text-xs); color: var(--ink-faint); }
  .week-scores { display: flex; gap: 4px; align-items: flex-end; height: 48px; }
  .week-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; justify-content: flex-end; }
  .week-fill { width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; }
  .week-num { font-size: 8px; color: var(--ink-faint); }

  .goal-reflections, .notes-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .goal-ref-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .goal-ref-check { display: flex; align-items: center; gap: var(--space-3); }
  .goal-ref-title { font-size: var(--text-base); color: var(--ink); }
  .goal-ref-card textarea { padding: var(--space-3); border-radius: var(--radius-sm); resize: none; font-size: var(--text-sm); background: var(--surface); border: 1px solid var(--border); color: var(--ink); }
  .notes-section textarea { width: 100%; padding: var(--space-3); border-radius: var(--radius-md); resize: none; font-size: var(--text-sm); background: var(--surface); border: 1px solid var(--border); color: var(--ink); }

  .save-btn { background: var(--accent); color: var(--accent-ink); font-weight: 600; padding: var(--space-4); border-radius: var(--radius-md); font-size: var(--text-base); }
  .save-btn:disabled { opacity: 0.5; }
</style>
