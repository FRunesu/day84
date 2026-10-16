<script>
  import { cycleReviewState } from "../stores/cycleReview.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";

  const cr = cycleReviewState();
  let selected = $state(null);
</script>

<div class="past-screen">
  <header class="screen-header">
    <button class="back-btn" onclick={() => showScreen(SCREENS.SETTINGS)}>← Back</button>
    <h1>Past Cycles</h1>
  </header>

  {#if cr.sortedReviews.length === 0}
    <div class="empty-state">
      <p>No completed cycles yet.</p>
      <p class="hint">Your cycle reviews will appear here after you complete a 12-week period.</p>
    </div>
  {:else if selected}
    <!-- Detail view -->
    <button class="back-link" onclick={() => (selected = null)}>← All cycles</button>
    <div class="detail">
      <h2>{selected.periodName || "Cycle"}</h2>
      <p class="detail-date">{selected.completedDate}</p>

      <div class="week-scores">
        {#each selected.weeklyScores as w}
          <div class="week-bar" title="Week {w.week}: {w.score}%">
            <div class="week-fill" style="height:{Math.min(100,w.score)}%;background:{w.score>=80?'var(--success)':w.score>=60?'var(--warning)':'var(--danger)'}"></div>
            <span class="week-num numeral">{w.week}</span>
          </div>
        {/each}
      </div>

      {#each selected.goalReflections as ref}
        <div class="goal-ref">
          <span class="goal-check">{ref.achieved ? "✓" : "○"}</span>
          <div>
            <p class="goal-title">{ref.title}</p>
            {#if ref.notes}<p class="goal-notes">{ref.notes}</p>{/if}
          </div>
        </div>
      {/each}

      {#if selected.notes}
        <div class="review-notes">
          <p class="notes-label">Reflection</p>
          <p>{selected.notes}</p>
        </div>
      {/if}
    </div>
  {:else}
    <!-- List view -->
    <div class="review-list">
      {#each cr.sortedReviews as review}
        {@const avgScore = review.weeklyScores?.length
          ? Math.round(review.weeklyScores.filter(w=>w.planned>0).reduce((a,b)=>a+b.score,0) / Math.max(1,review.weeklyScores.filter(w=>w.planned>0).length)*10)/10
          : 0}
        <button class="review-card" onclick={() => (selected = review)}>
          <div class="review-info">
            <span class="review-name">{review.periodName || "Cycle"}</span>
            <span class="review-date">{review.completedDate}</span>
          </div>
          <div class="review-score numeral" style="color:{avgScore>=80?'var(--success)':avgScore>=60?'var(--warning)':'var(--danger)'}">
            {avgScore}%
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .past-screen { padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) var(--space-8); display: flex; flex-direction: column; gap: var(--space-4); }
  .screen-header { display: flex; align-items: center; gap: var(--space-4); }
  h1 { font-size: var(--text-xl); margin: 0; }
  h2 { font-size: var(--text-lg); margin: 0; }
  .back-btn { color: var(--ink-muted); font-size: var(--text-sm); }
  .back-link { color: var(--accent); font-size: var(--text-sm); text-align: left; }

  .review-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .review-card {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: var(--space-4); width: 100%; text-align: left;
  }
  .review-name { font-size: var(--text-base); font-weight: 600; color: var(--ink); display: block; }
  .review-date { font-size: var(--text-xs); color: var(--ink-faint); }
  .review-score { font-size: var(--text-lg); font-weight: 700; }

  .detail { display: flex; flex-direction: column; gap: var(--space-4); }
  .detail-date { font-size: var(--text-sm); color: var(--ink-faint); margin: 0; }
  .week-scores { display: flex; gap: 4px; align-items: flex-end; height: 48px; }
  .week-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; justify-content: flex-end; }
  .week-fill { width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; }
  .week-num { font-size: 8px; color: var(--ink-faint); }

  .goal-ref { display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3) 0; border-bottom: 1px solid var(--border); }
  .goal-check { font-size: var(--text-lg); color: var(--success); flex-shrink: 0; }
  .goal-title { font-size: var(--text-sm); color: var(--ink); margin: 0; }
  .goal-notes { font-size: var(--text-xs); color: var(--ink-muted); margin: 4px 0 0; }

  .review-notes { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); }
  .notes-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-faint); margin: 0 0 var(--space-2) 0; }

  .empty-state { text-align: center; padding: var(--space-7) var(--space-4); color: var(--ink-muted); }
  .hint { font-size: var(--text-sm); color: var(--ink-faint); }
</style>
