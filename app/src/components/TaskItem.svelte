<script>
  let { task, onToggle, onEdit, onDelete } = $props();

  const completedToday = $derived(task.lastCompletedDate === todayKeyLocal());

  function todayKeyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
</script>

<div class="task-item" class:done={completedToday}>
  <button
    class="checkbox"
    class:checked={completedToday}
    onclick={() => onToggle(task.id)}
    aria-pressed={completedToday}
    aria-label={completedToday ? `Mark ${task.name} incomplete` : `Mark ${task.name} complete`}
  >
    {#if completedToday}✓{/if}
  </button>

  <button class="info" onclick={() => onEdit(task)}>
    <span class="name">{task.name}</span>
    <span class="meta">{task.time} · {task.durationMinutes} min</span>
  </button>

  {#if task.repeat}
    <div class="streak" title="Current streak">
      <span class="flame" aria-hidden="true">🔥</span>
      <span class="numeral count">{task.streak}</span>
    </div>
  {/if}

  <button class="delete-btn" onclick={() => onDelete(task.id)} aria-label={`Delete ${task.name}`}>
    ✕
  </button>
</div>

<style>
  .task-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    transition: background var(--duration-fast) var(--ease-out);
  }

  .task-item.done {
    border-color: var(--accent);
  }

  .checkbox {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    border: 2px solid var(--border-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-ink);
    font-size: 14px;
    font-weight: 700;
    transition: all var(--duration-fast) var(--ease-out);
  }

  .checkbox.checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  .name {
    font-size: var(--text-base);
    color: var(--ink);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .meta {
    font-size: var(--text-xs);
    color: var(--ink-faint);
  }

  .streak {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    color: var(--warning);
    font-size: var(--text-sm);
  }

  .flame {
    font-size: var(--text-sm);
  }

  .count {
    font-weight: 600;
  }

  .delete-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    color: var(--ink-faint);
    font-size: var(--text-xs);
  }

  .delete-btn:hover {
    color: var(--danger);
  }
</style>
