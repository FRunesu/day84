<script>
  import { onMount, onDestroy } from "svelte";
  import { userState, startNewCycle } from "../stores/user.svelte.js";
  import { getDashboardProgress, cycleDaysRemaining } from "../lib/time.js";
  import { applyAccentToDocument } from "../lib/accentColor.js";
  import ProgressBar from "../components/ProgressBar.svelte";

  const user = userState();

  let progress = $state({ day: 0, week: 0, cycle: 0, year: 0 });
  let daysLeft = $state(0);
  let intervalId;

  // A cycle is exactly 84 days — once it's elapsed, the dashboard
  // shouldn't keep showing "0 days left, 100% gone" forever. Offer
  // a clear path into a fresh cycle instead.
  const cycleComplete = $derived(progress.cycle >= 100);

  let startingNewCycle = $state(false);
  let nextGoal = $state("");
  let submittingNewCycle = $state(false);

  function recompute() {
    if (!user.profile) return;
    const next = getDashboardProgress(user.profile.cycleStartDate);
    progress = next;
    daysLeft = cycleDaysRemaining(user.profile.cycleStartDate);
    // Pass the local value, not a read-back of the `progress` state we
    // just wrote — reading your own just-written $state inside the same
    // effect run creates a read+write cycle that Svelte (correctly)
    // treats as an infinite loop.
    applyAccentToDocument(next.cycle);
  }

  onMount(() => {
    recompute();
    // The displayed percentages creep forward continuously through
    // the day — recompute on a slow interval rather than only on
    // navigation, so the dashboard feels alive while it's open.
    intervalId = setInterval(recompute, 60_000);
  });

  onDestroy(() => clearInterval(intervalId));

  $effect(() => {
    user.profile; // re-run if profile loads after mount
    recompute();
  });

  async function confirmNewCycle() {
    if (!nextGoal.trim()) return;
    submittingNewCycle = true;
    await startNewCycle({ twelveWeekGoal: nextGoal.trim() });
    submittingNewCycle = false;
    startingNewCycle = false;
    nextGoal = "";
    recompute();
  }
</script>

<div class="home">
  <header class="greeting">
    <span class="hello">Hey {user.profile?.name?.split(" ")[0] || ""}</span>
    <span class="goal-label">This cycle's goal</span>
    <span class="goal-text">{user.profile?.twelveWeekGoal}</span>
  </header>

  {#if cycleComplete && !startingNewCycle}
    <section class="hero complete">
      <div class="complete-badge">Cycle complete</div>
      <p class="complete-copy">Your 84 days are up. Look back at your Metrics before you set the next one.</p>
      <button class="start-cycle-btn" onclick={() => (startingNewCycle = true)}>Start a new 12-week cycle</button>
    </section>
  {:else if startingNewCycle}
    <section class="hero new-cycle-form">
      <h2>What's your goal for the next 12 weeks?</h2>
      <textarea rows="4" bind:value={nextGoal} placeholder="Specific. Achievable in 84 days."></textarea>
      <div class="new-cycle-actions">
        <button class="btn-ghost" onclick={() => (startingNewCycle = false)}>Cancel</button>
        <button class="btn-primary" disabled={!nextGoal.trim() || submittingNewCycle} onclick={confirmNewCycle}>
          {submittingNewCycle ? "Starting…" : "Start cycle"}
        </button>
      </div>
    </section>
  {:else}
    <section class="hero">
      <div class="hero-numeral numeral">{daysLeft}</div>
      <div class="hero-caption">day{daysLeft === 1 ? "" : "s"} left in this 12-week cycle</div>
      <div class="hero-track">
        <div class="hero-fill" style="width: {progress.cycle}%"></div>
      </div>
      <div class="hero-pct numeral">{progress.cycle.toFixed(1)}% of this cycle is already gone</div>
    </section>
  {/if}

  <section class="secondary-bars">
    <ProgressBar label="Today" percent={progress.day} />
    <ProgressBar label="This week" percent={progress.week} />
    <ProgressBar label="This year" percent={progress.year} sublabel="Calendar year, Jan 1 – Dec 31" />
  </section>
</div>

<style>
  .home {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .greeting {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .hello {
    font-size: var(--text-lg);
    color: var(--ink);
    font-weight: 600;
  }

  .goal-label {
    font-size: var(--text-xs);
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: var(--space-3);
  }

  .goal-text {
    font-size: var(--text-base);
    color: var(--ink-muted);
  }

  .hero {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .hero-numeral {
    font-size: var(--text-4xl);
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
    transition: color var(--duration-slow) var(--ease-out);
  }

  .hero-caption {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    margin-bottom: var(--space-3);
  }

  .hero-track {
    width: 100%;
    height: 10px;
    border-radius: var(--radius-full);
    background: var(--surface);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .hero-fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-full);
    transition: width var(--duration-slow) var(--ease-out), background var(--duration-slow) var(--ease-out);
  }

  .hero-pct {
    font-size: var(--text-xs);
    color: var(--ink-faint);
    margin-top: var(--space-2);
  }

  .secondary-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .hero.complete {
    gap: var(--space-3);
  }

  .complete-badge {
    background: var(--accent-soft);
    color: var(--accent);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 4px 12px;
    border-radius: var(--radius-full);
  }

  .complete-copy {
    color: var(--ink-muted);
    font-size: var(--text-sm);
    margin: 0;
  }

  .start-cycle-btn {
    width: 100%;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    margin-top: var(--space-2);
  }

  .new-cycle-form {
    align-items: stretch;
    text-align: left;
    gap: var(--space-3);
  }

  .new-cycle-form h2 {
    font-size: var(--text-base);
    color: var(--ink);
    margin: 0;
  }

  .new-cycle-form textarea {
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    resize: none;
  }

  .new-cycle-actions {
    display: flex;
    gap: var(--space-3);
  }

  .new-cycle-actions .btn-primary {
    flex: 1;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
  }

  .new-cycle-actions .btn-primary:disabled {
    opacity: 0.5;
  }

  .new-cycle-actions .btn-ghost {
    color: var(--ink-muted);
    padding: var(--space-3) var(--space-4);
  }
</style>
