<script>
  let { tactic, goalTitle = "", completed = false, hasMissWarning = false, onToggle, onEdit } = $props();
</script>

<div class="tactic-item" class:done={completed} class:warn={hasMissWarning}>
  <button
    class="checkbox"
    class:checked={completed}
    onclick={() => onToggle?.(tactic.id)}
    aria-pressed={completed}
    aria-label={completed ? `Uncheck ${tactic.title}` : `Complete ${tactic.title}`}
  >
    {#if completed}<span class="check-icon">✓</span>{/if}
  </button>

  <button class="info" onclick={() => onEdit?.(tactic)}>
    <span class="title" class:done-text={completed}>{tactic.title}</span>
    <span class="meta">
      {#if goalTitle}<span class="goal-name">{goalTitle}</span>{/if}
      {#if tactic.startTime}<span class="time">⏰ {tactic.startTime}</span>{/if}
    </span>
  </button>

  <div class="right-badges">
    {#if hasMissWarning}
      <span class="warn-badge" title="Missed twice in a row — don't let this become a pattern">⚠</span>
    {/if}
    <!-- Streak only shows if the user opted in to streak tracking for this task -->
    {#if tactic.trackStreak && tactic.streak > 0}
      <span class="streak-badge">
        <span class="flame">🔥</span>
        <span class="numeral streak-count">{tactic.streak}</span>
      </span>
    {/if}
  </div>
</div>

<style>
  .tactic-item {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);
    transition: border-color var(--duration-fast) var(--ease-out);
  }
  .tactic-item.done { border-color: var(--accent); }
  .tactic-item.warn { border-color: var(--warning); }

  .checkbox {
    flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--border-strong); display: flex; align-items: center; justify-content: center;
    transition: all var(--duration-fast) var(--ease-out); background: transparent;
  }
  .checkbox.checked { background: var(--accent); border-color: var(--accent); transform: scale(1.05); }
  .check-icon { color: var(--accent-ink); font-size: 14px; font-weight: 800; line-height: 1; }

  .info {
    flex: 1; display: flex; flex-direction: column; align-items: flex-start;
    text-align: left; min-width: 0; gap: 2px;
  }
  .title {
    font-size: var(--text-base); color: var(--ink); font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
    transition: opacity var(--duration-fast) var(--ease-out);
  }
  .title.done-text { opacity: 0.45; text-decoration: line-through; }
  .meta { display: flex; gap: var(--space-2); font-size: var(--text-xs); color: var(--ink-faint); }
  .time { color: var(--ink-muted); }

  .right-badges { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
  .streak-badge { display: flex; align-items: center; gap: 3px; }
  .flame { font-size: 13px; }
  .streak-count { font-size: var(--text-xs); color: var(--warning); font-weight: 700; }
  .warn-badge { font-size: var(--text-base); color: var(--warning); }
</style>
