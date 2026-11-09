<script>
  import { goalsState, addGoal, editGoal, deleteGoal, addTactic, editTactic, deleteTactic } from "../stores/goals.svelte.js";
  import { identityState } from "../stores/identity.svelte.js";
  import { routerState, openModal, closeModal, updateModalDraft, clearModalDraft } from "../stores/router.svelte.js";
  import Modal from "../components/Modal.svelte";
  import { DAY_NAMES } from "../lib/schema.js";
  import { periodState } from "../stores/period.svelte.js";
  import { chainDays, chainStats } from "../lib/chain.js";
  import ChainGrid from "../components/ChainGrid.svelte";

  const per = periodState();
  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
  const days = $derived(per.period ? chainDays(per.period.startDate, gs.tactics, gs.completions) : []);
  const chain = $derived(chainStats(days));

  const gs = goalsState();
  const id = identityState();
  const router = routerState();

  let expanded = $state(new Set());
  let newGoalTitle = $state("");
  let newGoalVisionId = $state(null);
  let addingGoal = $state(false);

  const EMPTY_TACTIC = { id: null, goalId: null, title: "", days: [], startTime: "", trackStreak: false };

  function toggle(goalId) {
    const next = new Set(expanded);
    next.has(goalId) ? next.delete(goalId) : next.add(goalId);
    expanded = next;
  }

  async function handleAddGoal() {
    if (!newGoalTitle.trim() || gs.goals.length >= 4) return;
    await addGoal({ title: newGoalTitle.trim(), visionCategoryId: newGoalVisionId });
    newGoalTitle = "";
    newGoalVisionId = null;
    addingGoal = false;
  }

  function openTacticModal(goalId, tactic = null) {
    openModal("tactic", tactic
      ? { ...tactic, startTime: tactic.startTime || "" }
      : { ...EMPTY_TACTIC, goalId });
  }

  async function saveTactic() {
    const d = router.modalDraft;
    if (!d?.title?.trim()) return;
    const payload = {
      goalId: d.goalId,
      title: d.title.trim(),
      days: d.days || [],
      startTime: d.startTime?.trim() || null,
      trackStreak: !!d.trackStreak,
    };
    if (d.id) await editTactic(d.id, payload);
    else await addTactic(payload);
    clearModalDraft();
    closeModal();
  }

  function toggleDay(day) {
    const current = router.modalDraft?.days ?? [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    updateModalDraft({ days: next });
  }

  function visionNameFor(categoryId) {
    if (!categoryId) return null;
    return id.categories.find(c => c.id === categoryId)?.name ?? null;
  }
</script>

<div class="goals-screen">
  <header class="screen-header">
    <h1>Goals & Tasks</h1>
    {#if gs.goals.length < 4}
      <button class="add-btn" onclick={() => (addingGoal = true)} aria-label="Add goal"><span>+</span></button>
    {/if}
  </header>

  {#if per.period}
    <section class="chain-card">
      <div class="chain-hd">
        <span class="chain-title">Unbroken chain</span>
        <span class="chain-meta"><b class="numeral">{chain.current}</b> current · <b class="numeral">{chain.best}</b> best</span>
      </div>
      <ChainGrid {days} />
      <div class="legend">
        <span><i class="sw done"></i>Done</span>
        <span><i class="sw miss"></i>Missed</span>
        <span><i class="sw rest"></i>Nothing planned</span>
      </div>
    </section>
  {/if}

  {#if addingGoal}
    <div class="add-goal-card">
      <label class="field-label">Goal</label>
      <input
        type="text"
        bind:value={newGoalTitle}
        placeholder="What do you want to achieve in 12 weeks?"
        onkeydown={e => e.key === "Enter" && handleAddGoal()}
      />

      {#if id.categories.length > 0}
        <label class="field-label" style="margin-top:var(--space-3)">Vision area (optional)</label>
        <select bind:value={newGoalVisionId}>
          <option value={null}>None</option>
          {#each id.categories as cat}
            <option value={cat.id}>{cat.name}</option>
          {/each}
        </select>
      {/if}

      <div class="add-goal-actions">
        <button class="btn-ghost-sm" onclick={() => { addingGoal = false; newGoalTitle = ""; newGoalVisionId = null; }}>Cancel</button>
        <button class="btn-accent-sm" onclick={handleAddGoal} disabled={!newGoalTitle.trim()}>Add goal</button>
      </div>
    </div>
  {/if}

  {#if gs.goals.length === 0}
    <div class="empty-state">
      <p>No goals yet.</p>
      <p class="hint">You can set up to 4 goals for this 12-week cycle. Tap + to add your first.</p>
    </div>
  {:else}
    <div class="goal-list">
      {#each gs.goals as goal (goal.id)}
        {@const goalTactics = gs.tactics.filter(t => t.goalId === goal.id)}
        {@const visionName = visionNameFor(goal.visionCategoryId)}

        <div class="goal-card">
          <button class="goal-header" onclick={() => toggle(goal.id)}>
            <div class="goal-header-left">
              <span class="goal-title">{goal.title}</span>
              {#if visionName}
                <span class="vision-tag">{visionName}</span>
              {/if}
            </div>
            <div class="goal-meta">
              <span class="tactic-count">{goalTactics.length} task{goalTactics.length !== 1 ? "s" : ""}</span>
              <span class="chevron">{expanded.has(goal.id) ? "▴" : "▾"}</span>
            </div>
          </button>

          {#if expanded.has(goal.id)}
            <div class="goal-body">
              {#each goalTactics as tactic (tactic.id)}
                <div class="tactic-row">
                  <div class="tactic-info">
                    <span class="tactic-name">{tactic.title}</span>
                    <div class="tactic-meta-row">
                      <span class="days">
                        {#each DAY_LETTERS as d, i}<span class="day-letter" class:sel={tactic.days.includes(i)}>{d}</span>{/each}
                      </span>
                      {#if tactic.trackStreak}<span class="option-badge">Streak{tactic.streak ? ` · ${tactic.streak}d` : ""}</span>{/if}
                      {#if tactic.startTime}<span class="option-badge">{tactic.startTime}</span>{/if}
                    </div>
                  </div>
                  <div class="tactic-actions">
                    <button class="icon-btn" onclick={() => openTacticModal(goal.id, tactic)}>✎</button>
                    <button class="icon-btn danger" onclick={() => deleteTactic(tactic.id)}>✕</button>
                  </div>
                </div>
              {/each}

              <div class="goal-footer">
                <button class="add-tactic-btn" onclick={() => openTacticModal(goal.id)}>+ Add task</button>
                <button class="delete-goal-btn" onclick={() => deleteGoal(goal.id)}>Delete goal</button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Tactic modal -->
{#if router.activeModal === "tactic"}
  <Modal title={router.modalDraft?.id ? "Edit task" : "New task"} onClose={closeModal}>
    <div class="tactic-form">
      <label>
        <span class="form-label">Task</span>
        <input type="text" value={router.modalDraft?.title ?? ""} oninput={e => updateModalDraft({ title: e.target.value })} placeholder="What needs to be done?" />
      </label>

      <div class="day-picker">
        <span class="form-label">Days</span>
        <div class="day-toggles">
          {#each DAY_NAMES as d, i}
            <button
              class="day-toggle"
              class:selected={(router.modalDraft?.days ?? []).includes(i)}
              onclick={() => toggleDay(i)}
            >{d}</button>
          {/each}
        </div>
        <span class="form-hint">Only scheduled days count toward your weekly score.</span>
      </div>

      <div class="toggle-field">
        <div class="toggle-text">
          <span class="form-label">Track streak</span>
          <span class="form-hint">Build a visible chain of consecutive completions.</span>
        </div>
        <label class="switch">
          <input type="checkbox" checked={router.modalDraft?.trackStreak ?? false} onchange={e => updateModalDraft({ trackStreak: e.target.checked })} />
          <span class="slider"></span>
        </label>
      </div>

      <label>
        <span class="form-label">Start time reminder (optional)</span>
        <input type="time" value={router.modalDraft?.startTime ?? ""} oninput={e => updateModalDraft({ startTime: e.target.value })} />
        <span class="form-hint">You will get an alert when it's time to begin.</span>
      </label>

      <button class="save-btn" onclick={saveTactic}>Save task</button>
    </div>
  </Modal>
{/if}

<style>
  .goals-screen {
    padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) calc(var(--nav-height) + var(--space-6));
    display: flex; flex-direction: column; gap: var(--space-3);
  }
  .chain-card { background: var(--bg-elevated); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .chain-hd { display: flex; justify-content: space-between; align-items: baseline; }
  .chain-title { font-size: var(--text-sm); font-weight: 600; }
  .chain-meta { font-size: var(--text-xs); color: var(--ink-muted); }
  .chain-meta b { color: var(--ink); }
  .legend { display: flex; gap: var(--space-3); font-size: 10px; color: var(--ink-muted); }
  .legend span { display: inline-flex; align-items: center; gap: 4px; }
  .sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
  .sw.done { background: var(--ink); }
  .sw.miss { border: 1.5px solid var(--danger); }
  .sw.rest { background: var(--empty); }
  .days { display: inline-flex; gap: 3px; }
  .day-letter { width: 16px; height: 16px; border-radius: 3px; font-size: 9px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; color: var(--ink-faint); background: var(--surface); }
  .day-letter.sel { color: var(--red-soft); background: var(--danger-soft); }
  .screen-header { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: var(--text-xl); margin: 0; }
  .add-btn { width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-elevated); color: var(--ink); font-size: 20px; font-weight: 500; display: flex; align-items: center; justify-content: center; padding: 0; }
  .add-btn span { line-height: 1; transform: translateY(-1px); }

  .add-goal-card { background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink-muted); display: block; }
  .add-goal-card input, .add-goal-card select { padding: var(--space-3); border-radius: 10px; font-size: var(--text-sm); background: var(--field); border: 1px solid var(--border); color: var(--ink); width: 100%; }
  .add-goal-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
  .btn-accent-sm { background: var(--accent); color: var(--accent-ink); font-weight: 500; padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); font-size: var(--text-sm); }
  .btn-accent-sm:disabled { opacity: 0.4; }
  .btn-ghost-sm { color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) var(--space-3); }

  .goal-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .goal-card { background: var(--bg-elevated); border-radius: var(--radius-md); overflow: hidden; }
  .goal-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); text-align: left; }
  .goal-header-left { display: flex; flex-direction: column; gap: 4px; }
  .goal-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
  .vision-tag { font-size: 10px; font-weight: 600; color: var(--ink-muted); background: var(--surface); padding: 2px 6px; border-radius: var(--radius-full); align-self: flex-start; }
  .goal-meta { display: flex; align-items: center; gap: var(--space-3); }
  .tactic-count { font-size: var(--text-xs); color: var(--ink-faint); }
  .chevron { font-size: var(--text-xs); color: var(--ink-muted); }

  .goal-body { border-top: 1px solid var(--border); padding: 0 var(--space-4) var(--space-3); display: flex; flex-direction: column; }
  .tactic-row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); padding: var(--space-3) 0; border-bottom: 1px solid var(--border); }
  .tactic-row:last-of-type { border-bottom: none; }
  .tactic-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .tactic-name { font-size: var(--text-sm); color: var(--ink); }
  .tactic-meta-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .option-badge { font-size: 10px; color: var(--ink-muted); }
  .tactic-actions { display: flex; gap: var(--space-2); }
  .icon-btn { color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-1) var(--space-2); }
  .icon-btn.danger:hover { color: var(--danger); }

  .goal-footer { display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-3); }
  .add-tactic-btn { color: var(--ink); font-size: var(--text-sm); font-weight: 500; }
  .delete-goal-btn { color: var(--danger); font-size: var(--text-xs); }

  /* Tactic modal form */
  .tactic-form { display: flex; flex-direction: column; gap: var(--space-4); }
  .tactic-form label { display: flex; flex-direction: column; gap: var(--space-2); }
  .form-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink-muted); }
  .form-hint { font-size: var(--text-xs); color: var(--ink-faint); line-height: 1.5; }
  .tactic-form input[type="text"], .tactic-form input[type="time"] { padding: var(--space-3); border-radius: 10px; font-size: var(--text-sm); background: var(--field); border: 1px solid var(--border); color: var(--ink); }
  .day-picker { display: flex; flex-direction: column; gap: var(--space-2); }
  .day-toggles { display: flex; gap: var(--space-2); }
  .day-toggle { flex: 1; padding: var(--space-2) 0; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; background: none; border: 1px solid var(--border); color: var(--ink-muted); transition: all var(--duration-fast) var(--ease-out); }
  .day-toggle.selected { background: var(--ink); border-color: var(--ink); color: var(--accent-ink); font-weight: 600; }

  .toggle-field { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); }
  .toggle-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .switch { display: flex; align-items: center; flex-shrink: 0; margin-top: 2px; }
  .slider { display: none; }

  .save-btn { background: var(--accent); color: var(--accent-ink); font-weight: 500; padding: var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-sm); }

  .empty-state { text-align: center; padding: var(--space-7) var(--space-4); color: var(--ink-muted); }
  .hint { font-size: var(--text-sm); color: var(--ink-faint); }
</style>
