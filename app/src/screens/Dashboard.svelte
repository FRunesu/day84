<script>
  import { onMount, onDestroy } from "svelte";
  import { userState } from "../stores/user.svelte.js";
  import { identityState, dismissVisionBanner } from "../stores/identity.svelte.js";
  import { periodState } from "../stores/period.svelte.js";
  import { goalsState, toggleCompletion, isTacticCompleted } from "../stores/goals.svelte.js";
  import { partnerState, refreshPartners, syncSharedData, pushPartner, selectPartner, dismissPush } from "../stores/partner.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";
  import { getDashboardProgress } from "../lib/time.js";
  import { calculateDayScore } from "../lib/weeklyScore.js";
  import { chainDays, chainStats } from "../lib/chain.js";
  import { isReviewDayToday } from "../lib/notifications.js";
  import { storageGetJSON } from "../lib/storage.js";
  import ScoreRing from "../components/ScoreRing.svelte";

  const user = userState();
  const id = identityState();
  const per = periodState();
  const gs = goalsState();
  const partner = partnerState();

  let timeProgress = $state({ day: 0, week: 0, cycle: 0, year: 0 });
  let dayScore = $state({ score: 0, planned: 0, completed: 0 });
  let chain = $state({ current: 0, best: 0 });
  let showReviewBanner = $state(false);
  let pushMsg = $state("");
  let pidx = $state(0);
  let strip;
  let intervalId;
  let syncTimer;

  const todayJsDay = new Date().getDay();
  const todayTactics = $derived(
    gs.tactics
      .filter((t) => t.days && t.days.includes(todayJsDay))
      .sort((a, b) => (a.startTime || "99").localeCompare(b.startTime || "99"))
  );
  const partners = $derived(partner.partners);
  const current = $derived(partners[Math.min(pidx, Math.max(0, partners.length - 1))] || null);

  function recompute() {
    if (!per.period) return;
    timeProgress = getDashboardProgress(per.period.startDate);
    dayScore = calculateDayScore(gs.tactics, gs.completions);
    chain = chainStats(chainDays(per.period.startDate, gs.tactics, gs.completions));
  }

  function sharedPayload() {
    const uid = user.profile?.id;
    if (!uid) return null;
    const cats = (id.categories || []).filter((c) => c.text?.trim());
    return {
      userName: user.profile.name,
      streaks: chain.current,
      bestStreak: chain.best,
      dayScore: dayScore.planned ? dayScore.score : null,
      dayPlanned: dayScore.planned,
      dayCompleted: dayScore.completed,
      cycleProgress: Math.round(per.cyclePercent),
      cycleDay: Math.min(84, Math.max(1, 84 - per.daysRemaining + 1)),
      goalText: gs.goals.map((g) => g.title).join(" · "),
      visionText: [id.statement ? `I am ${id.statement}` : "", ...cats.map((c) => `${c.name}: ${c.text}`)].filter(Boolean).join("\n"),
    };
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const p = sharedPayload();
      if (p) syncSharedData(user.profile.id, p);
    }, 800);
  }

  async function refresh() {
    if (!user.profile?.id) return;
    await refreshPartners(user.profile.id);
  }

  onMount(async () => {
    const notifSettings = await storageGetJSON("day84:notificationSettings", null);
    showReviewBanner = isReviewDayToday(notifSettings);
    recompute();
    await refresh();
    scheduleSync();
    intervalId = setInterval(() => { recompute(); refresh(); }, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  });

  onDestroy(() => { clearInterval(intervalId); clearTimeout(syncTimer); });

  $effect(() => {
    gs.completions;
    gs.tactics;
    recompute();
    scheduleSync();
  });

  function onStripScroll() {
    if (!strip) return;
    const i = Math.round(strip.scrollLeft / strip.clientWidth);
    if (i !== pidx) pidx = i;
  }

  async function handlePush() {
    if (!current) return;
    try {
      await pushPartner(user.profile.id, current.partnerId);
      pushMsg = `Push sent to ${current.partnerName}`;
    } catch (err) {
      pushMsg = err.message;
    }
    setTimeout(() => (pushMsg = ""), 2500);
  }

  function openStats(p) {
    selectPartner(p.partnerId);
    showScreen(SCREENS.PARTNER_STATS);
  }

  function streakLabel(t) {
    if (!t.trackStreak || !t.streak) return "";
    return `${t.streak}d streak`;
  }
</script>

<div class="dashboard">
  <div class="top">
    {#if !id.visionDismissedToday}
      <div class="banner">
        <span>Have you reviewed your vision today?</span>
        <div class="banner-actions">
          <button class="pill" onclick={() => showScreen(SCREENS.VISION)}>Review</button>
          <button class="dismiss" onclick={dismissVisionBanner} aria-label="Dismiss">✕</button>
        </div>
      </div>
    {/if}

    {#if showReviewBanner}
      <div class="banner">
        <span>It's your weekly review day. Take 5 minutes to reflect.</span>
        <div class="banner-actions">
          <button class="pill" onclick={() => showScreen(SCREENS.CYCLE_REVIEW)}>Review</button>
          <button class="dismiss" onclick={() => (showReviewBanner = false)} aria-label="Dismiss">✕</button>
        </div>
      </div>
    {/if}

    {#each partner.pushes as p (p.id)}
      <div class="banner push">
        <span><b>{p.fromName}</b> pushed you{dayScore.planned - dayScore.completed > 0 ? ` — ${dayScore.planned - dayScore.completed} task${dayScore.planned - dayScore.completed === 1 ? "" : "s"} still to do today` : ""}.</span>
        <button class="dismiss" onclick={() => dismissPush(p.id)} aria-label="Dismiss">✕</button>
      </div>
    {/each}

    {#if per.isComplete}
      <div class="banner">
        <span>Your 84 days are up. Review this cycle before starting the next.</span>
        <button class="pill" onclick={() => showScreen(SCREENS.CYCLE_REVIEW)}>Review cycle</button>
      </div>
    {/if}

    <section class="bars">
      <div class="bar">
        <div class="bar-label">Today <span class="numeral pct">{Math.round(timeProgress.day)}%</span></div>
        <div class="track"><i style="width:{timeProgress.day}%"></i></div>
      </div>
      <div class="bar">
        <div class="bar-label">This year <span class="numeral pct">{Math.round(timeProgress.year)}%</span></div>
        <div class="track"><i style="width:{timeProgress.year}%"></i></div>
      </div>
    </section>

    {#if partner.subscriptionActive && partners.length > 0}
      <section class="duo">
        <div class="card pc">
          <span class="av">{(user.profile?.name || "Y")[0].toUpperCase()}</span>
          <div class="pname">You</div>
          <ScoreRing score={dayScore.planned ? dayScore.score : null} size={56} />
          <div class="mut"><b>{chain.current}</b>-day chain</div>
        </div>
        <div class="strip" bind:this={strip} onscroll={onStripScroll}>
          {#each partners as p (p.partnerId)}
            <button class="card pc" onclick={() => openStats(p)}>
              <span class="av p">{(p.partnerName || "?")[0].toUpperCase()}</span>
              <div class="pname">{p.partnerName}</div>
              <ScoreRing score={p.data?.dayScore ?? null} size={56} />
              <div class="mut">{p.data?.streaks !== undefined ? `${p.data.streaks}-day chain` : "Chain hidden"}</div>
            </button>
          {/each}
        </div>
      </section>
      {#if partners.length > 1}
        <div class="dots">
          {#each partners as p, i (p.partnerId)}<i class:on={i === pidx}></i>{/each}
        </div>
      {/if}
      {#if current}
        <div class="btns">
          <button class="btn" onclick={handlePush}>Push {current.partnerName}</button>
          <button class="btn" onclick={() => openStats(current)}>See partner stats</button>
        </div>
      {/if}
      {#if pushMsg}<p class="toast">{pushMsg}</p>{/if}
    {:else}
      <section class="duo solo">
        <div class="card pc">
          <span class="av">{(user.profile?.name || "Y")[0].toUpperCase()}</span>
          <div class="pname">You</div>
          <ScoreRing score={dayScore.planned ? dayScore.score : null} size={56} />
          <div class="mut"><b>{chain.current}</b>-day chain</div>
        </div>
        <button class="card pc add" onclick={() => showScreen(SCREENS.PARTNER)}>
          <span class="av p">+</span>
          <div class="pname">Add a partner</div>
          <div class="mut">Keep each other on track</div>
        </button>
      </section>
    {/if}

    <div class="tasks-hd">
      <span class="tasks-title">Today's tasks</span>
      <span class="mut"><b class="numeral">{dayScore.completed}/{dayScore.planned}</b> done</span>
    </div>
  </div>

  <section class="tasksec">
    {#if todayTactics.length === 0}
      <p class="empty">No tasks scheduled for today. Add some on the Goals screen.</p>
    {:else}
      {#each todayTactics as t (t.id)}
        {@const done = isTacticCompleted(t.id)}
        <button class="task" class:done onclick={() => toggleCompletion(t.id)} aria-pressed={done}>
          <span class="cb" class:on={done}>{#if done}✓{/if}</span>
          <span class="tname">{t.title}</span>
          {#if streakLabel(t)}<span class="streak">{streakLabel(t)}</span>{/if}
        </button>
      {/each}
    {/if}
  </section>
</div>

<style>
  .dashboard {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) calc(var(--nav-height) + var(--safe-bottom) + var(--space-2));
    gap: var(--space-2);
  }
  .top { display: flex; flex-direction: column; gap: var(--space-3); flex-shrink: 0; }

  .banner {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm); color: var(--ink);
  }
  .banner.push { border: 1px solid var(--border-strong); }
  .banner-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
  .pill { background: var(--accent); color: var(--accent-ink); font-weight: 500; font-size: var(--text-xs); padding: 7px 12px; border-radius: var(--radius-full); white-space: nowrap; }
  .dismiss { color: var(--ink-muted); font-size: var(--text-sm); padding: 4px; }

  .bars { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 var(--space-1); }
  .bar { width: 50%; }
  .bar-label { display: flex; gap: var(--space-2); align-items: baseline; font-size: var(--text-sm); margin-bottom: 4px; }
  .pct { color: var(--ink-muted); font-size: var(--text-xs); }
  .track { height: 6px; background: var(--empty); overflow: hidden; }
  .track i { display: block; height: 100%; background: var(--ink); transition: width var(--duration-slow) var(--ease-out); }

  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: stretch; }
  .card { background: var(--bg-elevated); border-radius: var(--radius-md); color: var(--ink); text-align: center; }
  .pc { padding: 12px 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; height: 100%; font-family: inherit; }
  .pc.add { justify-content: center; }
  .av { width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: var(--accent-ink); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .av.p { background: var(--surface); color: var(--ink); }
  .pname { font-size: 12px; margin: 2px 0; }
  .mut { font-size: 12px; color: var(--ink-muted); }
  .strip { display: grid; grid-auto-flow: column; grid-auto-columns: 100%; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x mandatory; }
  .strip::-webkit-scrollbar { display: none; }
  .strip .pc { scroll-snap-align: start; }
  .dots { display: flex; justify-content: center; gap: 5px; margin-top: -6px; }
  .dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--empty); }
  .dots i.on { background: var(--ink); }
  .btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .btn { background: var(--accent); color: var(--accent-ink); font-weight: 500; font-size: 13px; padding: 13px 8px; border-radius: var(--radius-sm); }
  .toast { margin: 0; text-align: center; font-size: var(--text-xs); color: var(--ink-muted); }

  .tasks-hd { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-1) var(--space-1) 0; }
  .tasks-title { font-size: var(--text-base); font-weight: 600; }

  .tasksec { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-bottom: var(--space-2); }
  .task {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    background: var(--bg-elevated); border-radius: var(--radius-md); padding: 14px; font-size: var(--text-sm); color: var(--ink);
  }
  .cb { width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid var(--ink-muted); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .cb.on { background: var(--ink); border-color: var(--ink); color: var(--accent-ink); }
  .tname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task.done .tname { text-decoration: line-through; color: var(--ink-muted); }
  .streak { font-size: var(--text-xs); color: var(--danger); flex-shrink: 0; }
  .empty { color: var(--ink-muted); font-size: var(--text-sm); text-align: center; padding: var(--space-6) var(--space-4); }
</style>
