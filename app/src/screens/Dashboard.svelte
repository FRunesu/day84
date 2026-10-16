<script>
  import { onMount, onDestroy } from "svelte";
  import { userState } from "../stores/user.svelte.js";
  import { identityState, dismissVisionBanner } from "../stores/identity.svelte.js";
  import { periodState } from "../stores/period.svelte.js";
  import { goalsState } from "../stores/goals.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";
  import { applyAccentToDocument } from "../lib/accentColor.js";
  import { getDashboardProgress } from "../lib/time.js";
  import { calculateWeekScore, calculateDayScore, getWeekBounds } from "../lib/weeklyScore.js";
  import { isReviewDayToday } from "../lib/notifications.js";
  import { storageGetJSON, storageSetJSON } from "../lib/storage.js";
  import ProgressBar from "../components/ProgressBar.svelte";
  import ScoreWheel from "../components/ScoreWheel.svelte";

  const user = userState();
  const id = identityState();
  const per = periodState();
  const gs = goalsState();

  let timeProgress = $state({ day: 0, week: 0, cycle: 0, year: 0 });
  let dayScore = $state({ score: 0, planned: 0, completed: 0 });
  let weekScore = $state({ score: 0, planned: 0, completed: 0 });
  let notifSettings = $state(null);
  let showReviewBanner = $state(false);
  let intervalId;

  function recompute() {
    if (!per.period) return;
    const next = getDashboardProgress(per.period.startDate);
    timeProgress = next;
    applyAccentToDocument(next.cycle);
    const { weekStart } = getWeekBounds();
    weekScore = calculateWeekScore(gs.tactics, gs.completions, weekStart);
    dayScore = calculateDayScore(gs.tactics, gs.completions);
  }

  onMount(async () => {
    notifSettings = await storageGetJSON("day84:notificationSettings", null);
    showReviewBanner = isReviewDayToday(notifSettings);
    recompute();
    intervalId = setInterval(recompute, 60_000);
  });

  onDestroy(() => clearInterval(intervalId));

  $effect(() => {
    gs.completions; // re-run when completions change
    gs.tactics;
    recompute();
  });
</script>

<div class="dashboard">
  <!-- Identity anchor -->
  {#if id.statement}
    <div class="identity-anchor">
      <span class="identity-label">I am…</span>
      <span class="identity-text">{id.statement}</span>
    </div>
  {/if}

  <!-- Vision reminder banner -->
  {#if !id.visionDismissedToday}
    <div class="banner vision-banner">
      <span>Have you reviewed your vision today?</span>
      <div class="banner-actions">
        <button onclick={() => showScreen(SCREENS.VISION)}>Review</button>
        <button class="dismiss" onclick={dismissVisionBanner}>✕</button>
      </div>
    </div>
  {/if}

  <!-- Review day banner -->
  {#if showReviewBanner}
    <div class="banner review-banner">
      <span>📋 It's your weekly review day — take 5 minutes to reflect.</span>
      <button class="dismiss" onclick={() => (showReviewBanner = false)}>✕</button>
    </div>
  {/if}

  <!-- Week header -->
  <div class="week-header">
    <div class="week-label">
      <span class="numeral week-num">Week {per.weekNumber}</span>
      <span class="week-of"> of 12</span>
    </div>
    <span class="days-left numeral">{per.daysRemaining}d left</span>
  </div>

  <!-- Quick access to today's task list -->
  <button class="tasks-cta" onclick={() => showScreen(SCREENS.TODAY)}>
    <span class="tasks-cta-icon" aria-hidden="true">☑</span>
    <span class="tasks-cta-text">
      <span class="tasks-cta-label">Today's Tasks</span>
      <span class="tasks-cta-count">{dayScore.completed}/{dayScore.planned} done</span>
    </span>
    <span class="tasks-cta-arrow" aria-hidden="true">→</span>
  </button>

  <!-- Score wheels -->
  <div class="wheel-section">
    <div class="wheel-col">
      <ScoreWheel score={dayScore.score} planned={dayScore.planned} completed={dayScore.completed} size={150} />
      <p class="wheel-sub">Today's execution score</p>
    </div>
    <div class="wheel-col">
      <ScoreWheel score={weekScore.score} planned={weekScore.planned} completed={weekScore.completed} size={150} />
      <p class="wheel-sub">This week's execution score</p>
    </div>
  </div>

  <!-- Time progress bars -->
  <section class="time-bars">
    <ProgressBar label="Today" percent={timeProgress.day} />
    <ProgressBar label="This week" percent={timeProgress.week} />
    <ProgressBar label="12-week cycle" percent={timeProgress.cycle} sublabel="Week {per.weekNumber} of 12" />
    <ProgressBar label="This year" percent={timeProgress.year} sublabel="Calendar year, Jan 1 – Dec 31" />
  </section>

  <!-- Cycle complete prompt -->
  {#if per.isComplete}
    <div class="cycle-complete-card">
      <p class="cc-title">Cycle Complete 🎉</p>
      <p class="cc-sub">Your 84 days are up. Review your cycle before starting the next one.</p>
      <button class="cc-btn" onclick={() => showScreen(SCREENS.CYCLE_REVIEW)}>Start cycle review</button>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    padding: calc(var(--space-4) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .identity-anchor {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .identity-label { font-size: var(--text-xs); color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.06em; }
  .identity-text { font-size: var(--text-sm); color: var(--ink-muted); font-style: italic; }

  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    border: 1px solid;
  }
  .banner-actions { display: flex; gap: var(--space-2); align-items: center; flex-shrink: 0; }
  .vision-banner {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--ink);
  }
  .vision-banner button { color: var(--accent); font-weight: 600; font-size: var(--text-xs); }
  .review-banner { background: color-mix(in srgb, var(--warning) 12%, transparent); border-color: var(--warning); color: var(--ink); }
  .dismiss { color: var(--ink-faint); font-size: var(--text-xs); }

  .week-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0 var(--space-1);
  }
  .week-num { font-size: var(--text-2xl); font-weight: 700; color: var(--ink); }
  .week-of { font-size: var(--text-base); color: var(--ink-muted); }
  .days-left { font-size: var(--text-sm); color: var(--ink-faint); }

  .tasks-cta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
    text-align: left;
  }
  .tasks-cta-icon { font-size: var(--text-xl); color: var(--accent); flex-shrink: 0; }
  .tasks-cta-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .tasks-cta-label { font-size: var(--text-base); font-weight: 600; color: var(--ink); }
  .tasks-cta-count { font-size: var(--text-xs); color: var(--ink-faint); }
  .tasks-cta-arrow { font-size: var(--text-lg); color: var(--ink-faint); flex-shrink: 0; }

  .wheel-section { display: flex; justify-content: center; align-items: flex-start; gap: var(--space-6); }
  .wheel-col { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
  .wheel-sub { font-size: var(--text-xs); color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; text-align: center; }

  .time-bars {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .cycle-complete-card {
    background: color-mix(in srgb, var(--success) 10%, transparent);
    border: 1px solid var(--success);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    text-align: center;
  }
  .cc-title { font-size: var(--text-lg); font-weight: 700; margin: 0 0 var(--space-2) 0; }
  .cc-sub { font-size: var(--text-sm); color: var(--ink-muted); margin: 0 0 var(--space-4) 0; }
  .cc-btn {
    background: var(--success); color: #0d1117;
    font-weight: 600; padding: var(--space-3) var(--space-5); border-radius: var(--radius-md);
  }
</style>
