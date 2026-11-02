<script>
  import { partnerState, sendPartnerInvite, acceptPartnerInvite, updateSharePrefs, refreshPartners, selectPartner, MAX_PARTNERS } from "../stores/partner.svelte.js";
  import { userState } from "../stores/user.svelte.js";
  import { routerState, showScreen, SCREENS } from "../stores/router.svelte.js";
  import { onMount } from "svelte";

  const partner = partnerState();
  const user = userState();
  const router = routerState();

  let email = $state("");
  let sending = $state(false);
  let sendError = $state("");
  let sentInvite = $state(null);

  let code = $state(router.param?.inviteCode || "");
  let linking = $state(false);
  let linkError = $state("");
  let linkOk = $state("");
  let copiedId = $state("");

  onMount(() => { if (user.profile?.id) refreshPartners(user.profile.id); });

  async function handleSendInvite() {
    sendError = ""; sentInvite = null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { sendError = "Enter a valid email address."; return; }
    sending = true;
    try {
      sentInvite = await sendPartnerInvite(user.profile.id, user.profile.name, email.trim());
      email = "";
    } catch (err) {
      sendError = err.message || "Couldn't send that invite. Try again.";
    } finally { sending = false; }
  }

  async function handleAccept() {
    linkError = ""; linkOk = "";
    if (!code.trim()) { linkError = "Paste the invite code first."; return; }
    linking = true;
    try {
      const r = await acceptPartnerInvite(code.trim(), user.profile.id, user.profile.name);
      linkOk = `You're now linked with ${r.partnerName}.`;
      code = "";
      await refreshPartners(user.profile.id);
    } catch (err) {
      linkError = err.message;
    } finally { linking = false; }
  }

  async function copy(inv) {
    try { await navigator.clipboard.writeText(inv.inviteCode); copiedId = inv.id; setTimeout(() => (copiedId = ""), 1500); } catch {}
  }

  function openStats(p) { selectPartner(p.partnerId); showScreen(SCREENS.PARTNER_STATS); }

  const pending = $derived(partner.invites.filter((i) => i.status !== "accepted"));
</script>

<div class="screen">
  <button class="back" onclick={() => showScreen(SCREENS.SETTINGS)}>← Back</button>
  <h1>Accountability partners</h1>

  {#if !partner.subscriptionActive}
    <div class="card">
      <p class="lead">Accountability partners are a Day84 Plus feature.</p>
      <p class="mut">Linking with partners needs a small always-on server (to send invites and sync progress). That's the one part of Day84 with running costs, so it's the one part behind the subscription.</p>
      <button class="btn" onclick={() => showScreen(SCREENS.PAYWALL)}>See plans</button>
    </div>
  {:else}
    {#if partner.lastSyncError}<p class="err">{partner.lastSyncError}</p>{/if}

    <div class="card">
      <div class="hd"><span class="lbl">Linked</span><span class="mut">{partner.partners.length} of {MAX_PARTNERS}</span></div>
      {#if partner.partners.length === 0}
        <p class="mut" style="margin:0">No partners yet. Invite someone below, or enter a code they sent you.</p>
      {:else}
        {#each partner.partners as p (p.partnerId)}
          <button class="row" onclick={() => openStats(p)}>
            <span class="who"><span class="av">{(p.partnerName || "?")[0].toUpperCase()}</span>{p.partnerName}</span>
            <span class="mut"><span class:bad={p.data?.dayScore !== null && p.data?.dayScore !== undefined && p.data.dayScore < 50}>{p.data?.dayScore ?? "–"}{p.data?.dayScore !== null && p.data?.dayScore !== undefined ? "%" : ""}</span> today ›</span>
          </button>
        {/each}
      {/if}
    </div>

    {#if partner.canAddMore}
      <div class="card">
        <div class="lbl">Invite a partner</div>
        <p class="mut" style="margin:0">They get an invite code to enter in their Day84 app. We email it to them when email is set up; you can also copy and send it yourself.</p>
        <input type="email" placeholder="partner@email.com" bind:value={email} />
        {#if sendError}<p class="err">{sendError}</p>{/if}
        {#if sentInvite}
          <p class="ok">Invite created{sentInvite.emailed ? " and emailed" : ""}. Share this code:</p>
          <div class="code"><span>{sentInvite.inviteCode}</span><button class="mini" onclick={() => copy(sentInvite)}>{copiedId === sentInvite.id ? "Copied" : "Copy"}</button></div>
        {/if}
        <button class="btn" disabled={sending} onclick={handleSendInvite}>{sending ? "Sending…" : "Send invite"}</button>
      </div>

      <div class="card">
        <div class="lbl">Enter invite code</div>
        <p class="mut" style="margin:0">Got a code from someone? Paste it here to link up.</p>
        <input type="text" placeholder="Invite code" bind:value={code} autocapitalize="off" autocorrect="off" spellcheck="false" />
        {#if linkError}<p class="err">{linkError}</p>{/if}
        {#if linkOk}<p class="ok">{linkOk}</p>{/if}
        <button class="btn" disabled={linking} onclick={handleAccept}>{linking ? "Linking…" : "Link"}</button>
      </div>
    {:else}
      <p class="mut">You've reached the maximum of {MAX_PARTNERS} partners. Unlink one to invite someone new.</p>
    {/if}

    {#if partner.invites.length > 0}
      <div class="card">
        <div class="lbl">Invite history</div>
        {#each [...partner.invites].reverse() as inv (inv.id)}
          <div class="inv">
            <div class="inv-top"><span>{inv.recipientEmail}</span><span class="status" class:acc={inv.status === "accepted"}>{inv.status === "accepted" ? `accepted${inv.acceptedBy ? ` by ${inv.acceptedBy}` : ""}` : "pending"}</span></div>
            {#if inv.status !== "accepted" && inv.inviteCode}
              <div class="code"><span>{inv.inviteCode}</span><button class="mini" onclick={() => copy(inv)}>{copiedId === inv.id ? "Copied" : "Copy"}</button></div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="card">
      <div class="lbl">What partners can see</div>
      <p class="mut" style="margin:0">Today's execution score is always shared. Everything else is off by default unless you turn it on. Enforced on the server, not just hidden in the app.</p>
      <label class="toggle"><span>My streaks</span><input type="checkbox" checked={partner.sharePrefs.shareStreaks} onchange={(e) => updateSharePrefs({ shareStreaks: e.target.checked })} /></label>
      <label class="toggle"><span>My 12-week cycle progress</span><input type="checkbox" checked={partner.sharePrefs.shareCycleProgress} onchange={(e) => updateSharePrefs({ shareCycleProgress: e.target.checked })} /></label>
      <label class="toggle"><span>My 12-week goal text</span><input type="checkbox" checked={partner.sharePrefs.shareGoalText} onchange={(e) => updateSharePrefs({ shareGoalText: e.target.checked })} /></label>
      <label class="toggle"><span>My vision text</span><input type="checkbox" checked={partner.sharePrefs.shareVisionText} onchange={(e) => updateSharePrefs({ shareVisionText: e.target.checked })} /></label>
    </div>
  {/if}
</div>

<style>
  .screen { padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) var(--space-7); display: flex; flex-direction: column; gap: var(--space-2); }
  .back { align-self: flex-start; color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) 0; }
  h1 { font-size: var(--text-xl); margin: 0 0 var(--space-2); }
  .card { background: var(--bg-elevated); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: var(--text-sm); }
  .hd { display: flex; justify-content: space-between; align-items: center; }
  .lbl { font-size: var(--text-xs); color: var(--ink-muted); }
  .lead { margin: 0; font-size: var(--text-base); }
  .mut { color: var(--ink-muted); font-size: var(--text-xs); line-height: 1.5; }
  .err { color: var(--danger); font-size: var(--text-xs); margin: 0; }
  .ok { color: var(--ink); font-size: var(--text-xs); margin: 0; }
  .btn { background: var(--accent); color: var(--accent-ink); font-weight: 500; font-size: 13px; padding: 13px 8px; border-radius: var(--radius-sm); }
  .btn:disabled { opacity: 0.5; }
  .row { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; padding: 8px 0; border-top: 1px solid var(--border); color: var(--ink); font-size: var(--text-sm); }
  .who { display: flex; align-items: center; gap: 10px; }
  .av { width: 28px; height: 28px; border-radius: 50%; background: var(--surface); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .bad { color: var(--danger); }
  input:not([type="checkbox"]) { width: 100%; padding: 11px 12px; border-radius: 10px; background: var(--field); }
  .code { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: var(--field); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; word-break: break-all; }
  .mini { background: var(--accent); color: var(--accent-ink); font-size: 11px; padding: 5px 10px; border-radius: 6px; flex-shrink: 0; }
  .inv { display: flex; flex-direction: column; gap: 6px; padding: 6px 0; border-top: 1px solid var(--border); }
  .inv-top { display: flex; justify-content: space-between; gap: 8px; }
  .status { color: var(--ink-muted); font-size: var(--text-xs); }
  .status.acc { color: var(--ink); }
  .toggle { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid var(--border); }
</style>
