<script>
  import { userState, wipeLocalUser } from "../stores/user.svelte.js";
  import { identityState, wipeIdentity } from "../stores/identity.svelte.js";
  import { periodState, restartPeriod, wipePeriod } from "../stores/period.svelte.js";
  import { goalsState, wipeGoalsAndTactics } from "../stores/goals.svelte.js";
  import { wipeCycleReviews } from "../stores/cycleReview.svelte.js";
  import { deleteAccountCascade } from "../stores/partner.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";
  import { downloadBackup, parseBackupFile, restoreFromBackup } from "../lib/export.js";
  import { storageGetJSON, storageSetJSON } from "../lib/storage.js";
  import { STORAGE_BACKEND } from "../lib/storage.js";
  import { DAY_NAMES_FULL, defaultNotificationSettings } from "../lib/schema.js";
  import { scheduleWeeklyReview, requestPermissions } from "../lib/notifications.js";
  import { themeState, setTheme } from "../stores/theme.svelte.js";
  import { partnerState } from "../stores/partner.svelte.js";
  import { getApiBase, setApiBase, checkHealth, DEFAULT_API_BASE } from "../lib/api.js";

  const user = userState();
  const id = identityState();
  const per = periodState();
  const gs = goalsState();

  let notifSettings = $state(defaultNotificationSettings());
  let fileInput;
  let restoreMessage = $state("");
  let deleting = $state(false);
  let notifSaved = $state(false);
  const theme = themeState();
  const partner = partnerState();
  let apiBase = $state(getApiBase());
  let apiMsg = $state("");

  async function saveApiBase() {
    await setApiBase(apiBase);
    apiBase = getApiBase();
    apiMsg = "Checking…";
    try { await checkHealth(); apiMsg = "Connected."; }
    catch (err) { apiMsg = err.message; }
  }

  async function loadNotifSettings() {
    notifSettings = await storageGetJSON("day84:notificationSettings", defaultNotificationSettings());
  }
  loadNotifSettings();

  async function saveNotifSettings() {
    await storageSetJSON("day84:notificationSettings", notifSettings);
    if (notifSettings.weeklyReviewEnabled) await requestPermissions();
    await scheduleWeeklyReview(notifSettings);
    notifSaved = true;
    setTimeout(() => (notifSaved = false), 2000);
  }

  async function handleRestartKeepData() {
    if (!confirm("Restart the 12-week cycle from today? Your goals and tactics will carry forward.")) return;
    await restartPeriod();
    alert("New cycle started. Goals and tactics carried forward.");
  }

  async function handleFullReset() {
    if (!confirm("Clear everything — vision, identity, goals, tactics — and restart from scratch? This cannot be undone.")) return;
    await wipeIdentity();
    await wipeGoalsAndTactics();
    await wipePeriod();
    await wipeCycleReviews();
    window.location.reload();
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account and all data permanently? If you have a partner they will immediately lose your shared data.")) return;
    deleting = true;
    try {
      if (user.profile?.id) await deleteAccountCascade(user.profile.id);
      await wipeLocalUser();
      await wipeIdentity();
      await wipeGoalsAndTactics();
      await wipePeriod();
      await wipeCycleReviews();
    } finally {
      deleting = false;
      window.location.reload();
    }
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await parseBackupFile(file);
      await restoreFromBackup(payload);
      restoreMessage = "Restored. Reload the app to see your data.";
    } catch (err) { restoreMessage = err.message; }
  }
</script>

<div class="settings-screen">
  <h1>Settings</h1>

  <!-- Appearance -->
  <section class="group">
    <h2>Appearance</h2>
    <label class="toggle-row">
      <span>Light mode</span>
      <input type="checkbox" checked={theme.isLight} onchange={(e) => setTheme(e.target.checked ? "light" : "dark")} />
    </label>
  </section>

  <!-- Partners -->
  <section class="group">
    <h2>Accountability</h2>
    <button class="nav-row" onclick={() => showScreen(SCREENS.PARTNER)}>
      <span>Accountability partners</span>
      <span class="sub">{partner.subscriptionActive ? `${partner.partners.length} linked ›` : "Anvil Plus ›"}</span>
    </button>
    {#if partner.subscriptionActive}
      <label class="field-col">
        <span>Sync server</span>
        <div class="inline">
          <input type="url" bind:value={apiBase} placeholder={DEFAULT_API_BASE} autocapitalize="off" autocorrect="off" spellcheck="false" />
          <button class="action-btn small" onclick={saveApiBase}>Save</button>
        </div>
        {#if apiMsg}<span class="sub">{apiMsg}</span>{/if}
      </label>
    {/if}
  </section>

  <!-- Notifications -->
  <section class="group">
    <h2>Notifications</h2>

    <label class="toggle-row">
      <span>Weekly review reminder</span>
      <input type="checkbox" bind:checked={notifSettings.weeklyReviewEnabled} />
    </label>

    {#if notifSettings.weeklyReviewEnabled}
      <label class="field-row">
        <span>Day</span>
        <select bind:value={notifSettings.weeklyReviewDay}>
          {#each DAY_NAMES_FULL as d}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </label>
      <label class="field-row">
        <span>Time</span>
        <input type="time" bind:value={notifSettings.weeklyReviewTime} />
      </label>
    {/if}

    <label class="toggle-row">
      <span>Tactic start-time alerts</span>
      <input type="checkbox" bind:checked={notifSettings.taskAlertsEnabled} />
    </label>

    <button class="action-btn" onclick={saveNotifSettings}>
      {notifSaved ? "Saved ✓" : "Save notification settings"}
    </button>
  </section>

  <!-- Cycle management -->
  <section class="group">
    <h2>Cycle Management</h2>
    <p class="sub">Current cycle: {per.period?.name ?? "—"} (Week {per.weekNumber} of 12)</p>
    <button class="action-btn secondary" onclick={handleRestartKeepData}>Restart cycle (keep goals & tactics)</button>
    <button class="action-btn" onclick={() => showScreen(SCREENS.CYCLE_REVIEW)}>Start cycle review</button>
  </section>

  <!-- History -->
  <section class="group">
    <h2>History</h2>
    <button class="action-btn secondary" onclick={() => showScreen(SCREENS.PAST_CYCLES)}>Browse past cycles</button>
    <button class="action-btn secondary" onclick={() => showScreen(SCREENS.YEAR_REVIEW)}>{new Date().getFullYear()} Year in Review</button>
  </section>

  <!-- Backup -->
  <section class="group">
    <h2>Backup</h2>
    <p class="sub">Your data lives on this device ({STORAGE_BACKEND}). Export regularly.</p>
    <button class="action-btn" onclick={downloadBackup}>Export backup (.json)</button>
    <button class="action-btn secondary" onclick={() => fileInput.click()}>Restore from backup</button>
    <input bind:this={fileInput} type="file" accept="application/json" hidden onchange={handleRestore} />
    {#if restoreMessage}<p class="msg">{restoreMessage}</p>{/if}
  </section>

  <!-- Legal -->
  <section class="group">
    <h2>Legal</h2>
    <button class="link-row" onclick={() => showScreen(SCREENS.LEGAL, "privacy")}>Privacy Policy</button>
    <button class="link-row" onclick={() => showScreen(SCREENS.LEGAL, "terms")}>Terms of Service</button>
  </section>

  <!-- Danger zone -->
  <section class="group danger">
    <button class="action-btn warn" onclick={handleFullReset}>Reset vision + restart from scratch</button>
    <button class="action-btn danger-btn" disabled={deleting} onclick={handleDeleteAccount}>
      {deleting ? "Deleting…" : "Delete account & all data"}
    </button>
  </section>
</div>

<style>
  .settings-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex; flex-direction: column; gap: var(--space-5);
  }
  h1 { font-size: var(--text-xl); margin: 0; }
  h2 { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-muted); margin: 0 0 var(--space-3) 0; }
  .group { background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .nav-row { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm); color: var(--ink); text-align: left; padding: 0; }
  .field-col { display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--text-sm); color: var(--ink); border-top: 1px solid var(--border); padding-top: var(--space-3); }
  .inline { display: flex; gap: var(--space-2); }
  .inline input { flex: 1; min-width: 0; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--field); font-size: var(--text-xs); }
  .action-btn.small { padding: var(--space-2) var(--space-3); font-size: var(--text-xs); }
  .sub { font-size: var(--text-sm); color: var(--ink-faint); margin: 0; }
  .toggle-row { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm); color: var(--ink); }
  .field-row { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-sm); color: var(--ink); }
  .field-row select, .field-row input[type="time"] { background: var(--field); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3); color: var(--ink); font-size: var(--text-sm); }
  .action-btn { background: var(--accent); color: var(--accent-ink); font-weight: 500; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); text-align: center; font-size: var(--text-sm); }
  .action-btn.secondary { background: var(--surface); color: var(--ink); }
  .action-btn.warn { background: var(--surface); color: var(--ink-muted); }
  .action-btn:disabled { opacity: 0.5; }
  .danger-btn { background: var(--danger-soft); color: var(--danger); }
  .link-row { color: var(--ink); font-size: var(--text-sm); padding: var(--space-2) 0; text-decoration: none; border-bottom: 1px solid var(--border); text-align: left; }
  .link-row:last-child { border-bottom: none; }
  .danger { border: 1px solid var(--danger-soft); }
  .msg { font-size: var(--text-sm); color: var(--ink-muted); }
</style>
