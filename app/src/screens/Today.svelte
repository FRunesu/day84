<script>
  import { goalsState, toggleCompletion, isTacticCompleted } from "../stores/goals.svelte.js";
  import { DAY_NAMES_FULL } from "../lib/schema.js";
  import TacticItem from "../components/TacticItem.svelte";

  const gs = goalsState();

  const todayJsDay = new Date().getDay();
  const todayLabel = DAY_NAMES_FULL[todayJsDay];

  const todayTactics = $derived(
    gs.tactics.filter(t => t.days && t.days.includes(todayJsDay))
  );

  const missWarningIds = $derived(
    new Set(gs.doubleMissTactics.map(t => t.id))
  );

  // Group today's tactics by goal
  const grouped = $derived(() => {
    const map = new Map();
    for (const tactic of todayTactics) {
      const goal = gs.goals.find(g => g.id === tactic.goalId);
      const key = goal?.id ?? "none";
      if (!map.has(key)) map.set(key, { goal, tactics: [] });
      map.get(key).tactics.push(tactic);
    }
    return [...map.values()];
  });

  const completedCount = $derived(
    todayTactics.filter(t => isTacticCompleted(t.id)).length
  );
</script>

<div class="today-screen">
  <header class="screen-header">
    <div>
      <h1>Today</h1>
      <p class="date-sub">{todayLabel}, {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p>
    </div>
    <div class="count-badge numeral">
      {completedCount}/{todayTactics.length}
    </div>
  </header>

  <!-- Double-miss warnings -->
  {#each gs.doubleMissTactics as t}
    <div class="miss-warning">
      <span>⚠ You've missed <strong>{t.title}</strong> twice in a row. Don't let this become a habit.</span>
    </div>
  {/each}

  {#if todayTactics.length === 0}
    <div class="empty-state">
      <p>No tactics scheduled for today.</p>
      <p class="hint">Add tactics on the Goals screen and assign them days.</p>
    </div>
  {:else}
    <div class="groups">
      {#each grouped() as { goal, tactics }}
        <div class="group">
          {#if goal}
            <p class="group-label">{goal.title}</p>
          {/if}
          <div class="tactic-list">
            {#each tactics as tactic (tactic.id)}
              <TacticItem
                {tactic}
                goalTitle={goal?.title ?? ""}
                completed={isTacticCompleted(tactic.id)}
                hasMissWarning={missWarningIds.has(tactic.id)}
                onToggle={toggleCompletion}
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .today-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .screen-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  h1 { font-size: var(--text-xl); margin: 0; }
  .date-sub { font-size: var(--text-sm); color: var(--ink-muted); margin: 2px 0 0 0; }
  .count-badge {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink);
  }
  .miss-warning {
    background: color-mix(in srgb, var(--warning) 14%, transparent);
    border: 1px solid var(--warning);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    color: var(--ink);
  }
  .groups { display: flex; flex-direction: column; gap: var(--space-5); }
  .group { display: flex; flex-direction: column; gap: var(--space-3); }
  .group-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
    margin: 0;
  }
  .tactic-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .empty-state { text-align: center; padding: var(--space-7) var(--space-4); color: var(--ink-muted); }
  .hint { font-size: var(--text-sm); color: var(--ink-faint); }
</style>
