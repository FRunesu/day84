<script>
  import { goalsState, addGoal, editGoal, deleteGoal, addTactic, editTactic, deleteTactic } from "../stores/goals.svelte.js";
  import { identityState } from "../stores/identity.svelte.js";
  import { routerState, openModal, closeModal, updateModalDraft, clearModalDraft } from "../stores/router.svelte.js";
  import Modal from "../components/Modal.svelte";
  import { DAY_NAMES } from "../lib/schema.js";

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
      <button class="add-btn" onclick={() => (addingGoal = true)}>+</button>
    {/if}
  </header>

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
                      {#each DAY_NAMES as d, i}
                        {#if tactic.days.includes(i)}<span class="day-badge">{d}</span>{/if}
                      {/each}
                      {#if tactic.trackStreak}<span class="option-badge">🔥 Streak</span>{/if}
                      {#if tactic.startTime}<span class="option-badge">⏰ {tactic.startTime}</span>{/if}
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
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex; flex-direction: column; gap: var(--space-4);
  }
  .screen-header { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: var(--text-xl); margin: 0; }
  .add-btn { width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--accent); color: var(--accent-ink); font-size: var(--text-xl); font-weight: 600; }

  .add-goal-card { background: var(--bg-elevated); border: 1px solid var(--accent); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink-muted); display: block; }
  .add-goal-card input, .add-goal-card select { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-base); background: var(--surface); border: 1px solid var(--border); color: var(--ink); width: 100%; }
  .add-goal-actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
  .btn-accent-sm { background: var(--accent); color: var(--accent-ink); font-weight: 600; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-sm); }
  .btn-accent-sm:disabled { opacity: 0.4; }
  .btn-ghost-sm { color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) var(--space-3); }

  .goal-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .goal-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .goal-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); text-align: left; }
  .goal-header-left { display: flex; flex-direction: column; gap: 4px; }
  .goal-title { font-size: var(--text-base); font-weight: 600; color: var(--ink); }
  .vision-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--accent); background: var(--accent-soft); padding: 2px 6px; border-radius: var(--radius-full); align-self: flex-start; }
  .goal-meta { display: flex; align-items: center; gap: var(--space-3); }
  .tactic-count { font-size: var(--text-xs); color: var(--ink-faint); }
  .chevron { font-size: var(--text-xs); color: var(--ink-muted); }

  .goal-body { border-top: 1px solid var(--border); padding: var(--space-3) var(--space-5) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .tactic-row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
  .tactic-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .tactic-name { font-size: var(--text-sm); color: var(--ink); }
  .tactic-meta-row { display: flex; flex-wrap: wrap; gap: 4px; }
  .day-badge { font-size: 10px; font-weight: 700; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: var(--radius-full); }
  .option-badge { font-size: 10px; color: var(--ink-faint); background: var(--surface); padding: 2px 6px; border-radius: var(--radius-full); }
  .tactic-actions { display: flex; gap: var(--space-2); }
  .icon-btn { color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-1) var(--space-2); }
  .icon-btn.danger:hover { color: var(--danger); }

  .goal-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: var(--space-3); margin-top: var(--space-1); }
  .add-tactic-btn { color: var(--accent); font-size: var(--text-sm); font-weight: 600; }
  .delete-goal-btn { color: var(--danger); font-size: var(--text-xs); opacity: 0.7; }

  /* Tactic modal form */
  .tactic-form { display: flex; flex-direction: column; gap: var(--space-4); }
  .tactic-form label { display: flex; flex-direction: column; gap: var(--space-2); }
  .form-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink-muted); }
  .form-hint { font-size: var(--text-xs); color: var(--ink-faint); line-height: 1.5; }
  .tactic-form input[type="text"], .tactic-form input[type="time"] { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-base); background: var(--surface); border: 1px solid var(--border); color: var(--ink); }
  .day-picker { display: flex; flex-direction: column; gap: var(--space-2); }
  .day-toggles { display: flex; gap: var(--space-2); }
  .day-toggle { flex: 1; padding: var(--space-2) 0; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 700; background: var(--surface); border: 1px solid var(--border); color: var(--ink-muted); transition: all var(--duration-fast) var(--ease-out); }
  .day-toggle.selected { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

  .toggle-field { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); }
  .toggle-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; margin-top: 2px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background: var(--border-strong); border-radius: var(--radius-full); transition: 0.2s; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
  .switch input:checked + .slider { background: var(--accent); }
  .switch input:checked + .slider:before { transform: translateX(20px); }

  .save-btn { background: var(--accent); color: var(--accent-ink); font-weight: 600; padding: var(--space-4); border-radius: var(--radius-md); }

  .empty-state { text-align: center; padding: var(--space-7) var(--space-4); color: var(--ink-muted); }
  .hint { font-size: var(--text-sm); color: var(--ink-faint); }
</style>
