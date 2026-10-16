<script>
  import { completeOnboarding } from "../stores/user.svelte.js";
  import { createAndSavePeriod } from "../stores/period.svelte.js";
  import { addGoal, addTactic } from "../stores/goals.svelte.js";
  import { storageSetJSON } from "../lib/storage.js";
  import { KEYS, DEFAULT_VISION_CATEGORIES, DAY_NAMES } from "../lib/schema.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";

  let step = $state(0);
  let submitting = $state(false);

  // Step 0 — Age
  let ageConfirmed = $state(false);

  // Step 1 — Name
  let name = $state("");

  // Step 2 — Identity
  let identityStatement = $state("");

  // Step 3 — Period
  let periodName = $state("");

  // Step 4 — Vision categories (add/remove/edit during onboarding)
  let visionDrafts = $state(DEFAULT_VISION_CATEGORIES.map(c => ({ ...c, text: "" })));

  function addVisionCategory() {
    visionDrafts = [...visionDrafts, {
      id: crypto.randomUUID(), name: "New category", text: "", order: visionDrafts.length
    }];
  }
  function removeVisionCategory(idx) {
    visionDrafts = visionDrafts.filter((_, i) => i !== idx);
  }
  function updateCatName(idx, val) {
    visionDrafts = visionDrafts.map((c, i) => i === idx ? { ...c, name: val } : c);
  }
  function updateCatText(idx, val) {
    visionDrafts = visionDrafts.map((c, i) => i === idx ? { ...c, text: val } : c);
  }

  // Step 5 — Goals + tasks
  let savedGoals = $state([]);
  let goalSubStep = $state("goal"); // "goal" | "tasks"

  // Goal form
  let goalTitle = $state("");
  let goalVisionId = $state(null);

  // Tasks for the current goal
  let currentTactics = $state([]);

  // Tactic form
  let showTacticForm = $state(false);
  let tacticTitle = $state("");
  let tacticDays = $state([]);
  let tacticStreak = $state(false);
  let tacticTime = $state("");

  function goToTasks() {
    if (!goalTitle.trim()) return;
    goalSubStep = "tasks";
    showTacticForm = true; // open tactic form immediately
  }

  function toggleDay(day) {
    tacticDays = tacticDays.includes(day)
      ? tacticDays.filter(d => d !== day)
      : [...tacticDays, day];
  }

  function addTacticToList() {
    if (!tacticTitle.trim()) return;
    currentTactics = [...currentTactics, {
      id: crypto.randomUUID(),
      title: tacticTitle.trim(),
      days: [...tacticDays],
      trackStreak: tacticStreak,
      startTime: tacticTime.trim() || null,
    }];
    tacticTitle = "";
    tacticDays = [];
    tacticStreak = false;
    tacticTime = "";
    showTacticForm = false;
  }

  function removeTactic(id) {
    currentTactics = currentTactics.filter(t => t.id !== id);
  }

  function saveGoal() {
    if (!goalTitle.trim()) return;
    savedGoals = [...savedGoals, {
      id: crypto.randomUUID(),
      title: goalTitle.trim(),
      visionCategoryId: goalVisionId,
      tactics: [...currentTactics],
    }];
    // Reset for next goal
    goalTitle = "";
    goalVisionId = null;
    currentTactics = [];
    showTacticForm = false;
    goalSubStep = "goal";
  }

  function removeSavedGoal(id) {
    savedGoals = savedGoals.filter(g => g.id !== id);
  }

  function startAnotherGoal() {
    goalTitle = "";
    goalVisionId = null;
    currentTactics = [];
    goalSubStep = "goal";
    showTacticForm = false;
  }

  const STEPS = [
    { key: "age",      title: "Before we start" },
    { key: "name",     title: "What should we call you?" },
    { key: "identity", title: "Declare your identity" },
    { key: "period",   title: "Name your cycle" },
    { key: "vision",   title: "Your vision" },
    { key: "goals",    title: "Your goals & tasks" },
  ];

  const current = $derived(STEPS[step]);

  const canContinue = $derived(
    (step === 0 && ageConfirmed) ||
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && identityStatement.trim().length > 0) ||
    step === 3 ||
    step === 4 ||
    (step === 5 && savedGoals.length > 0)
  );

  function next() {
    if (step < STEPS.length - 1) step++;
    else finish();
  }
  function back() { if (step > 0) step--; }

  async function finish() {
    submitting = true;
    await completeOnboarding({ name: name.trim() });
    await storageSetJSON(KEYS.IDENTITY, {
      statement: identityStatement.trim(),
      categories: visionDrafts,
    });
    await createAndSavePeriod({ name: periodName.trim() });
    for (const g of savedGoals) {
      const saved = await addGoal({ title: g.title, visionCategoryId: g.visionCategoryId });
      if (saved) {
        for (const t of g.tactics) {
          await addTactic({
            goalId: saved.id,
            title: t.title,
            days: t.days,
            startTime: t.startTime,
            trackStreak: t.trackStreak,
          });
        }
      }
    }
    submitting = false;
    showScreen(SCREENS.DASHBOARD);
  }
</script>

<div class="onboarding">
  <div class="progress-dots">
    {#each STEPS as _, i}
      <span class="dot" class:active={i === step} class:complete={i < step}></span>
    {/each}
  </div>

  <div class="content">
    <h1>{current.title}</h1>

    <!-- Step 0: Age -->
    {#if current.key === "age"}
      <p class="copy">Day84 is for ages 13 and up. By continuing you agree to our Terms of Service and Privacy Policy.</p>
      <label class="check-row">
        <input type="checkbox" bind:checked={ageConfirmed} />
        <span>I confirm I am 13 or older</span>
      </label>

    <!-- Step 1: Name -->
    {:else if current.key === "name"}
      <input type="text" bind:value={name} placeholder="Your name" autocomplete="given-name" />
      <div class="hint-box">
        <span class="hint-icon">💡</span>
        <span>This is how the app will address you throughout your journey.</span>
      </div>

    <!-- Step 2: Identity -->
    {:else if current.key === "identity"}
      <p class="copy">Write your identity in the present tense as if you already are that person — even if you're not there yet. Someone who has never run a race writes <em>"I am a marathon runner."</em></p>
      <div class="identity-prefix">I am…</div>
      <textarea rows="3" bind:value={identityStatement} placeholder="a marathon runner who shows up every day and never misses a session"></textarea>
      <div class="hint-box">
        <span class="hint-icon">💡</span>
        <span>Your identity is the foundation of lasting behaviour change. When you claim an identity, your actions follow. Every task you complete is a vote for the person you have declared yourself to be.</span>
      </div>

    <!-- Step 3: Period -->
    {:else if current.key === "period"}
      <input type="text" bind:value={periodName} placeholder="e.g. Q3 Launch Sprint (optional)" />
      <div class="hint-box">
        <span class="hint-icon">💡</span>
        <span>A name makes it easy to identify this cycle when reviewing your history later. Your 84-day cycle starts from today — short enough to feel urgent, long enough to produce real results.</span>
      </div>

    <!-- Step 4: Vision -->
    {:else if current.key === "vision"}
      <p class="copy">Your vision is the big picture — where you want to be years from now in each area of life. Your goals each cycle are the stepping stones toward that picture. Fill in what you can and return to this any time from the Vision tab.</p>

      <div class="hint-box">
        <span class="hint-icon">💡</span>
        <span>You can rename, add, or remove categories to match your life. Tap the label to rename it.</span>
      </div>

      <div class="vision-list">
        {#each visionDrafts as cat, i}
          <div class="vision-cat">
            <div class="cat-header">
              <input
                class="cat-name-input"
                type="text"
                value={cat.name}
                oninput={e => updateCatName(i, e.target.value)}
                placeholder="Category name"
              />
              <button class="remove-cat-btn" onclick={() => removeVisionCategory(i)} aria-label="Remove {cat.name}">✕</button>
            </div>
            <textarea
              rows="3"
              value={cat.text}
              oninput={e => updateCatText(i, e.target.value)}
              placeholder="Describe your vision for {cat.name.toLowerCase()}…"
            ></textarea>
          </div>
        {/each}
        <button class="add-cat-btn" onclick={addVisionCategory}>+ Add category</button>
      </div>

    <!-- Step 5: Goals + Tasks -->
    {:else if current.key === "goals"}

      <div class="hint-box">
        <span class="hint-icon">💡</span>
        <span>
          <strong>How it all connects:</strong> Your vision is where you want to be long-term.
          Goals are the specific outcomes you will achieve in the next 84 days toward that vision.
          Tasks are the daily or weekly actions that guarantee you reach each goal.
          Your weekly score is based entirely on how consistently you complete your scheduled tasks.
        </span>
      </div>

      <!-- Goal form (sub-step: "goal") -->
      {#if goalSubStep === "goal"}
        <div class="sub-section">
          <label class="field-label">Goal</label>
          <input
            type="text"
            bind:value={goalTitle}
            placeholder="e.g. Run a 5k without stopping"
          />
          <div class="hint-box small">
            <span class="hint-icon">💡</span>
            <span>Make it specific and measurable — not "get fit" but "run a 5k". Vague goals produce vague effort.</span>
          </div>

          {#if visionDrafts.length > 0}
            <label class="field-label" style="margin-top: var(--space-3)">Which vision area does this goal support?</label>
            <select bind:value={goalVisionId} class="vision-select">
              <option value={null}>None selected</option>
              {#each visionDrafts as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
            <div class="hint-box small">
              <span class="hint-icon">💡</span>
              <span>Linking goals to vision areas lets you review which parts of your life you focused on at the end of each cycle and year.</span>
            </div>
          {/if}

          <button
            class="btn-accent"
            disabled={!goalTitle.trim()}
            onclick={goToTasks}
          >Set up tasks for this goal →</button>
        </div>

      <!-- Tasks form (sub-step: "tasks") -->
      {:else if goalSubStep === "tasks"}
        <div class="goal-being-built">
          <span class="gbb-label">Goal</span>
          <span class="gbb-title">{goalTitle}</span>
        </div>

        <div class="hint-box">
          <span class="hint-icon">💡</span>
          <span>Tasks are the non-negotiable actions that — done consistently — guarantee you reach this goal. Select specific days. Committing to which days removes the daily decision of "when will I do this" — it is already decided.</span>
        </div>

        <!-- Added tasks list -->
        {#each currentTactics as tactic}
          <div class="tactic-added">
            <div class="tactic-added-info">
              <span class="tactic-added-title">{tactic.title}</span>
              <div class="tactic-added-meta">
                {#each DAY_NAMES as d, i}
                  {#if tactic.days.includes(i)}<span class="day-mini">{d}</span>{/if}
                {/each}
                {#if tactic.days.length === 0}<span class="no-days">No days set</span>{/if}
                {#if tactic.trackStreak}<span class="tag-mini">🔥 Streak</span>{/if}
                {#if tactic.startTime}<span class="tag-mini">⏰ {tactic.startTime}</span>{/if}
              </div>
            </div>
            <button class="remove-sm" onclick={() => removeTactic(tactic.id)}>✕</button>
          </div>
        {/each}

        <!-- Add task form -->
        {#if showTacticForm}
          <div class="tactic-form-card">
            <label class="field-label">Task name</label>
            <input type="text" bind:value={tacticTitle} placeholder="e.g. Morning run, Read for 30 minutes" />

            <label class="field-label" style="margin-top:var(--space-3)">Which days?</label>
            <div class="day-toggles">
              {#each DAY_NAMES as d, i}
                <button class="day-toggle" class:selected={tacticDays.includes(i)} onclick={() => toggleDay(i)}>{d}</button>
              {/each}
            </div>

            <div class="toggle-field">
              <div class="toggle-text">
                <span class="field-label">Track streak</span>
                <span class="field-hint-sm">Build a visible chain of consecutive completions — never miss twice.</span>
              </div>
              <label class="switch">
                <input type="checkbox" bind:checked={tacticStreak} />
                <span class="slider"></span>
              </label>
            </div>

            <div class="time-field">
              <label class="field-label">Start time reminder (optional)</label>
              <input type="time" bind:value={tacticTime} />
              <span class="field-hint-sm">Your phone will alert you when it is time to begin this task.</span>
            </div>

            <div class="tactic-form-actions">
              <button class="btn-ghost-sm" onclick={() => { showTacticForm = false; }}>Cancel</button>
              <button class="btn-accent-sm" disabled={!tacticTitle.trim()} onclick={addTacticToList}>Add task</button>
            </div>
          </div>
        {:else}
          <button class="add-tactic-link" onclick={() => (showTacticForm = true)}>+ Add another task</button>
        {/if}

        <button class="save-goal-btn" onclick={saveGoal}>
          Save goal{currentTactics.length > 0 ? ` with ${currentTactics.length} task${currentTactics.length > 1 ? "s" : ""}` : ""}
        </button>
      {/if}

      <!-- Saved goals list -->
      {#if savedGoals.length > 0}
        <div class="saved-goals">
          <p class="saved-label">Saved goals</p>
          {#each savedGoals as g}
            <div class="saved-goal-card">
              <div class="sgc-info">
                <span class="sgc-title">{g.title}</span>
                <span class="sgc-tasks">{g.tactics.length} task{g.tactics.length !== 1 ? "s" : ""}</span>
              </div>
              <button class="remove-sm" onclick={() => removeSavedGoal(g.id)}>✕</button>
            </div>
          {/each}
          {#if savedGoals.length < 4 && goalSubStep !== "tasks"}
            <button class="add-another-goal-btn" onclick={startAnotherGoal}>+ Add another goal</button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Navigation -->
  <div class="actions">
    {#if step > 0}
      <button class="btn-ghost" onclick={back}>Back</button>
    {/if}
    <button
      class="btn-primary"
      disabled={!canContinue || submitting}
      onclick={next}
    >
      {#if step === STEPS.length - 1}
        {submitting ? "Setting up…" : "Start my cycle →"}
      {:else if step === 4}
        Continue →
      {:else}
        Continue
      {/if}
    </button>
  </div>
</div>

<style>
  .onboarding {
    display: flex; flex-direction: column; min-height: 100vh;
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) var(--space-6);
  }
  .progress-dots { display: flex; gap: var(--space-2); margin-bottom: var(--space-6); }
  .dot { flex: 1; height: 4px; border-radius: var(--radius-full); background: var(--border); }
  .dot.active, .dot.complete { background: var(--accent); }

  .content { flex: 1; display: flex; flex-direction: column; gap: var(--space-4); }
  h1 { font-size: var(--text-2xl); line-height: 1.25; margin: 0; }
  .copy { color: var(--ink-muted); font-size: var(--text-sm); line-height: 1.6; margin: 0; }
  .copy em { color: var(--ink); font-style: italic; }

  input[type="text"], textarea, select {
    width: 100%; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
    font-size: var(--text-base); resize: none;
    background: var(--surface); border: 1px solid var(--border); color: var(--ink);
  }
  input[type="text"]:focus, textarea:focus, select:focus { border-color: var(--accent); outline: none; }
  input[type="time"] { background: var(--surface); border: 1px solid var(--border); color: var(--ink); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); }

  .check-row { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-base); color: var(--ink); }
  .identity-prefix { font-size: var(--text-base); font-weight: 700; color: var(--accent); margin-bottom: calc(var(--space-2) * -1); }
  .field-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink-muted); display: block; }
  .field-hint-sm { font-size: var(--text-xs); color: var(--ink-faint); display: block; margin-top: 2px; line-height: 1.5; }

  .hint-box {
    display: flex; gap: var(--space-2); align-items: flex-start;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
    font-size: var(--text-xs); color: var(--ink-muted); line-height: 1.6;
  }
  .hint-box.small { padding: var(--space-2) var(--space-3); }
  .hint-box strong { color: var(--ink); }
  .hint-icon { flex-shrink: 0; font-size: 14px; }

  /* Vision */
  .vision-list { display: flex; flex-direction: column; gap: var(--space-4); max-height: 55vh; overflow-y: auto; padding-right: 2px; }
  .vision-cat { display: flex; flex-direction: column; gap: var(--space-2); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); }
  .cat-header { display: flex; justify-content: space-between; align-items: center; }
  .cat-name-input {
    font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--ink-muted); background: transparent; border: none; outline: none; padding: 0; width: 100%;
  }
  .cat-name-input:focus { color: var(--accent); }
  .remove-cat-btn { color: var(--ink-faint); font-size: 12px; flex-shrink: 0; padding: 2px 6px; }
  .remove-cat-btn:hover { color: var(--danger); }
  .add-cat-btn { color: var(--accent); font-size: var(--text-sm); font-weight: 600; text-align: left; }

  /* Goals */
  .sub-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .vision-select { background: var(--surface); }
  .btn-accent {
    background: var(--accent); color: var(--accent-ink); font-weight: 600;
    padding: var(--space-3) var(--space-5); border-radius: var(--radius-md);
    align-self: flex-start; margin-top: var(--space-2);
  }
  .btn-accent:disabled { opacity: 0.4; }

  .goal-being-built {
    background: var(--bg-elevated); border: 1px solid var(--accent);
    border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
    display: flex; flex-direction: column; gap: 2px;
  }
  .gbb-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-faint); }
  .gbb-title { font-size: var(--text-base); font-weight: 600; color: var(--ink); }

  .tactic-added {
    display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2);
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
  }
  .tactic-added-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .tactic-added-title { font-size: var(--text-sm); color: var(--ink); font-weight: 500; }
  .tactic-added-meta { display: flex; flex-wrap: wrap; gap: 4px; }
  .day-mini { font-size: 10px; font-weight: 700; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: var(--radius-full); }
  .no-days { font-size: 10px; color: var(--ink-faint); }
  .tag-mini { font-size: 10px; color: var(--ink-muted); background: var(--surface); padding: 2px 6px; border-radius: var(--radius-full); }
  .remove-sm { color: var(--ink-faint); font-size: 12px; flex-shrink: 0; padding: 2px 4px; }
  .remove-sm:hover { color: var(--danger); }

  .tactic-form-card {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
  }
  .day-toggles { display: flex; gap: 4px; }
  .day-toggle {
    flex: 1; padding: var(--space-2) 0; border-radius: var(--radius-sm); font-size: 11px; font-weight: 700;
    background: var(--surface); border: 1px solid var(--border); color: var(--ink-muted);
    transition: all var(--duration-fast) var(--ease-out);
  }
  .day-toggle.selected { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

  .toggle-field {
    display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
    border-top: 1px solid var(--border); padding-top: var(--space-3);
  }
  .toggle-text { flex: 1; }

  /* Custom toggle switch */
  .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; cursor: pointer; inset: 0; background: var(--border-strong);
    border-radius: var(--radius-full); transition: 0.2s;
  }
  .slider:before {
    position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
    background: white; border-radius: 50%; transition: 0.2s;
  }
  .switch input:checked + .slider { background: var(--accent); }
  .switch input:checked + .slider:before { transform: translateX(20px); }

  .time-field { display: flex; flex-direction: column; gap: var(--space-2); border-top: 1px solid var(--border); padding-top: var(--space-3); }
  .tactic-form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); border-top: 1px solid var(--border); padding-top: var(--space-3); }
  .btn-accent-sm { background: var(--accent); color: var(--accent-ink); font-weight: 600; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-sm); }
  .btn-accent-sm:disabled { opacity: 0.4; }
  .btn-ghost-sm { color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) var(--space-3); }

  .add-tactic-link { color: var(--accent); font-size: var(--text-sm); font-weight: 600; text-align: left; }

  .save-goal-btn {
    background: var(--success); color: #0d1117; font-weight: 700;
    padding: var(--space-4); border-radius: var(--radius-md); width: 100%; margin-top: var(--space-2);
  }

  .saved-goals { display: flex; flex-direction: column; gap: var(--space-2); border-top: 1px solid var(--border); padding-top: var(--space-4); margin-top: var(--space-2); }
  .saved-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-faint); margin: 0; }
  .saved-goal-card {
    display: flex; justify-content: space-between; align-items: center;
    background: color-mix(in srgb, var(--success) 10%, transparent);
    border: 1px solid var(--success); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
  }
  .sgc-info { display: flex; flex-direction: column; gap: 2px; }
  .sgc-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
  .sgc-tasks { font-size: var(--text-xs); color: var(--ink-faint); }
  .add-another-goal-btn { color: var(--accent); font-size: var(--text-sm); font-weight: 600; text-align: left; padding: var(--space-2) 0; }

  /* Navigation */
  .actions { display: flex; gap: var(--space-3); padding-top: var(--space-5); padding-bottom: var(--safe-bottom); margin-top: auto; }
  .btn-primary {
    flex: 1; background: var(--accent); color: var(--accent-ink);
    font-weight: 600; padding: var(--space-4); border-radius: var(--radius-md); font-size: var(--text-base);
  }
  .btn-primary:disabled { opacity: 0.4; }
  .btn-ghost { padding: var(--space-4) var(--space-5); color: var(--ink-muted); border-radius: var(--radius-md); }
</style>
