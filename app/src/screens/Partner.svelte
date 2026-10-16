<script>
  import { partnerState, sendPartnerInvite, updateSharePrefs, unlinkPartner } from "../stores/partner.svelte.js";
  import { userState } from "../stores/user.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";

  const partner = partnerState();
  const user = userState();

  let email = $state("");
  let sending = $state(false);
  let sendError = $state("");
  let sendSuccess = $state(false);

  async function handleSendInvite() {
    sendError = "";
    sendSuccess = false;
    if (!email.includes("@")) {
      sendError = "Enter a valid email address.";
      return;
    }
    sending = true;
    try {
      await sendPartnerInvite(user.profile.id, user.profile.name, email.trim());
      sendSuccess = true;
      email = "";
    } catch (err) {
      sendError = err.message || "Couldn't send that invite. Try again.";
    } finally {
      sending = false;
    }
  }

  async function handleUnlink() {
    if (!confirm("Unlink your accountability partner? They'll immediately lose access to anything you were sharing.")) return;
    await unlinkPartner(user.profile.id);
  }
</script>

<div class="partner-screen">
  <header class="screen-header">
    <h1>Accountability partner</h1>
  </header>

  {#if !partner.subscriptionActive}
    <div class="paywall-card">
      <p class="lead">Accountability partners are a Day84 Plus feature.</p>
      <p class="sub">Linking with a partner needs a small always-on backend (to send invites and sync progress) — that's the one part of Day84 with real running costs, so it's the one part behind the subscription.</p>
      <button class="upgrade-btn" onclick={() => showScreen(SCREENS.PAYWALL)}>See plans</button>
    </div>
  {:else if partner.isLinked}
    <div class="linked-card">
      <p class="linked-with">Linked with <strong>{partner.partnerLink.partnerName}</strong></p>
      <button class="unlink-btn" onclick={handleUnlink}>Unlink partner</button>
    </div>

    <section class="prefs">
      <h2>What {partner.partnerLink.partnerName} can see</h2>
      <p class="prefs-note">Off by default for anything personal — you choose what's visible. This is enforced on our server, not just hidden in the app, so it's actually private either way.</p>

      <label class="toggle-row">
        <span>My streaks</span>
        <input type="checkbox" checked={partner.sharePrefs.shareStreaks} onchange={(e) => updateSharePrefs({ shareStreaks: e.target.checked })} />
      </label>
      <label class="toggle-row">
        <span>My 12-week cycle progress</span>
        <input type="checkbox" checked={partner.sharePrefs.shareCycleProgress} onchange={(e) => updateSharePrefs({ shareCycleProgress: e.target.checked })} />
      </label>
      <label class="toggle-row">
        <span>My 12-week goal text</span>
        <input type="checkbox" checked={partner.sharePrefs.shareGoalText} onchange={(e) => updateSharePrefs({ shareGoalText: e.target.checked })} />
      </label>
      <label class="toggle-row">
        <span>My 10-year vision text</span>
        <input type="checkbox" checked={partner.sharePrefs.shareVisionText} onchange={(e) => updateSharePrefs({ shareVisionText: e.target.checked })} />
      </label>
    </section>

    {#if partner.partnerData}
      <section class="partner-view">
        <h2>What they're sharing with you</h2>
        {#if partner.partnerData.streaks !== undefined}
          <p>Longest active streak: <span class="numeral">{partner.partnerData.streaks}</span></p>
        {/if}
        {#if partner.partnerData.cycleProgress !== undefined}
          <p>Cycle progress: <span class="numeral">{partner.partnerData.cycleProgress}%</span></p>
        {/if}
        {#if !partner.partnerData.streaks && !partner.partnerData.cycleProgress}
          <p class="hint">They haven't chosen to share anything yet.</p>
        {/if}
      </section>
    {/if}
  {:else}
    <div class="invite-form">
      <p class="lead">Invite someone to keep each other on track.</p>
      <p class="sub">We'll email them a real invite with a link to download Day84 and link up automatically.</p>

      <input type="email" placeholder="partner@email.com" bind:value={email} />
      {#if sendError}<p class="error">{sendError}</p>{/if}
      {#if sendSuccess}<p class="success">Invite sent.</p>{/if}

      <button class="send-btn" disabled={sending} onclick={handleSendInvite}>
        {sending ? "Sending…" : "Send invite"}
      </button>
    </div>

    {#if partner.invites.length > 0}
      <section class="invite-history">
        <h2>Invite history</h2>
        {#each partner.invites as invite}
          <div class="invite-row">
            <span>{invite.recipientEmail}</span>
            <span class="status status-{invite.status}">{invite.status}</span>
          </div>
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .partner-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  h1 {
    font-size: var(--text-xl);
    margin: 0;
  }

  h2 {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 var(--space-3) 0;
  }

  .paywall-card,
  .linked-card,
  .invite-form,
  .prefs,
  .partner-view,
  .invite-history {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
  }

  .lead {
    font-size: var(--text-base);
    color: var(--ink);
    margin: 0 0 var(--space-2) 0;
  }

  .sub {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    margin: 0 0 var(--space-4) 0;
  }

  .upgrade-btn,
  .send-btn {
    width: 100%;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }

  .send-btn:disabled {
    opacity: 0.5;
  }

  input[type="email"] {
    width: 100%;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);
  }

  .error {
    color: var(--danger);
    font-size: var(--text-sm);
  }

  .success {
    color: var(--success);
    font-size: var(--text-sm);
  }

  .linked-with {
    margin: 0 0 var(--space-3) 0;
  }

  .unlink-btn {
    color: var(--danger);
    font-size: var(--text-sm);
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .toggle-row:last-child {
    border-bottom: none;
  }

  .prefs-note {
    font-size: var(--text-xs);
    color: var(--ink-faint);
    margin: 0 0 var(--space-3) 0;
  }

  .invite-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    font-size: var(--text-sm);
  }

  .status {
    text-transform: capitalize;
    color: var(--ink-muted);
  }

  .status-sent,
  .status-accepted {
    color: var(--success);
  }

  .status-failed {
    color: var(--danger);
  }

  .hint {
    color: var(--ink-faint);
    font-size: var(--text-sm);
  }
</style>
