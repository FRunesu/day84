<script>
  import { partnerState, pushPartner, unlinkPartner } from "../stores/partner.svelte.js";
  import { userState } from "../stores/user.svelte.js";
  import { routerState, showScreen, SCREENS } from "../stores/router.svelte.js";
  import ScoreRing from "../components/ScoreRing.svelte";

  const partner = partnerState();
  const user = userState();
  const router = routerState();

  const p = $derived(partner.selectedPartner);
  const d = $derived(p?.data || {});
  let msg = $state("");

  function back() {
    showScreen(router.previous === SCREENS.PARTNER ? SCREENS.PARTNER : SCREENS.DASHBOARD);
  }

  async function handlePush() {
    try {
      await pushPartner(user.profile.id, p.partnerId);
      msg = `Push sent to ${p.partnerName}`;
    } catch (err) {
      msg = err.message;
    }
    setTimeout(() => (msg = ""), 2500);
  }

  async function handleUnlink() {
    if (!confirm(`Unlink ${p.partnerName}? You'll both immediately stop seeing each other's progress.`)) return;
    await unlinkPartner(user.profile.id, p.partnerId);
    back();
  }
</script>

<div class="screen">
  <button class="back" onclick={back}>← Back</button>
  {#if !p}
    <p class="mut">That partner is no longer linked.</p>
  {:else}
    <h1>{p.partnerName}'s stats</h1>
    <p class="mut lead">Only what {p.partnerName} has chosen to share with you.</p>

    <div class="card center">
      <ScoreRing score={d.dayScore ?? null} size={110} />
      <div class="mut">Today's execution score{d.dayPlanned ? ` · ${d.dayCompleted}/${d.dayPlanned} tasks` : ""}</div>
    </div>

    <div class="card">
      {#if d.streaks !== undefined}
        <div class="row"><span>Current chain</span><b>{d.streaks} days</b></div>
        <div class="row"><span>Best chain</span><b>{d.bestStreak ?? 0} days</b></div>
      {:else}
        <div class="row"><span>Streaks</span><span class="mut">Not shared</span></div>
      {/if}
    </div>

    <div class="card">
      {#if d.cycleProgress !== undefined}
        <div class="row"><span>12-week cycle</span><span class="mut">{d.cycleDay ? `Day ${d.cycleDay} of 84` : `${d.cycleProgress}%`}</span></div>
        <div class="track"><i style="width:{d.cycleProgress}%"></i></div>
      {:else}
        <div class="row"><span>Cycle progress</span><span class="mut">Not shared</span></div>
      {/if}
    </div>

    <div class="card">
      {#if d.goalText !== undefined}
        <div class="lbl">12-week goals</div>
        <div class="txt">{d.goalText || "—"}</div>
      {:else}
        <div class="row"><span>12-week goal text</span><span class="mut">Not shared</span></div>
      {/if}
      {#if d.visionText !== undefined}
        <div class="lbl" style="margin-top: 12px">Vision</div>
        <div class="txt pre">{d.visionText || "—"}</div>
      {:else}
        <div class="row"><span>Vision text</span><span class="mut">Not shared</span></div>
      {/if}
    </div>

    {#if d.updatedAt}<p class="mut small">Last updated {new Date(d.updatedAt).toLocaleString()}</p>{/if}

    <div class="btns">
      <button class="btn" onclick={handlePush}>Push {p.partnerName}</button>
      <button class="btn ghost" onclick={handleUnlink}>Unlink</button>
    </div>
    {#if msg}<p class="mut small center">{msg}</p>{/if}
  {/if}
</div>

<style>
  .screen { padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) var(--space-6); display: flex; flex-direction: column; gap: var(--space-2); }
  .back { align-self: flex-start; color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) 0; }
  h1 { font-size: var(--text-xl); margin: 0; }
  .mut { color: var(--ink-muted); font-size: var(--text-sm); }
  .lead { margin: -4px 0 var(--space-2); }
  .small { font-size: var(--text-xs); margin: 0; }
  .center { text-align: center; }
  .card { background: var(--bg-elevated); border-radius: var(--radius-md); padding: 14px; font-size: var(--text-sm); display: flex; flex-direction: column; gap: 8px; }
  .card.center { align-items: center; }
  .row { display: flex; justify-content: space-between; align-items: center; }
  .track { height: 6px; background: var(--empty); overflow: hidden; }
  .track i { display: block; height: 100%; background: var(--ink); }
  .lbl { font-size: var(--text-xs); color: var(--ink-muted); }
  .txt { font-size: var(--text-sm); }
  .pre { white-space: pre-wrap; }
  .btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: var(--space-2); }
  .btn { background: var(--accent); color: var(--accent-ink); font-weight: 500; font-size: 13px; padding: 13px 8px; border-radius: var(--radius-sm); }
  .btn.ghost { background: var(--bg-elevated); color: var(--ink-muted); }
</style>
