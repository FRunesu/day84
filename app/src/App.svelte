<script>
  import { onMount } from "svelte";
  import { routerState, SCREENS, showScreen } from "./stores/router.svelte.js";
  import { userState, loadUser } from "./stores/user.svelte.js";
  import { loadIdentity } from "./stores/identity.svelte.js";
  import { loadPeriod } from "./stores/period.svelte.js";
  import { loadGoals } from "./stores/goals.svelte.js";
  import { loadCycleReviews } from "./stores/cycleReview.svelte.js";
  import { loadPartnerState } from "./stores/partner.svelte.js";
  import { loadTheme } from "./stores/theme.svelte.js";

  import NavBar from "./components/NavBar.svelte";
  import Onboarding from "./screens/Onboarding.svelte";
  import Dashboard from "./screens/Dashboard.svelte";
  import Goals from "./screens/Goals.svelte";
  import Vision from "./screens/Vision.svelte";
  import CycleReview from "./screens/CycleReview.svelte";
  import PastCycles from "./screens/PastCycles.svelte";
  import YearInReview from "./screens/YearInReview.svelte";
  import Settings from "./screens/Settings.svelte";
  import Partner from "./screens/Partner.svelte";
  import Paywall from "./screens/Paywall.svelte";
  import PartnerStats from "./screens/PartnerStats.svelte";
  import Legal from "./screens/Legal.svelte";

  const router = routerState();
  const user = userState();

  let ready = $state(false);

  const NAV_SCREENS = new Set([
    SCREENS.DASHBOARD, SCREENS.GOALS, SCREENS.VISION, SCREENS.SETTINGS
  ]);

  onMount(async () => {
    await Promise.all([
      loadTheme(),
      loadUser(),
      loadIdentity(),
      loadPeriod(),
      loadGoals(),
      loadCycleReviews(),
      loadPartnerState(),
    ]);
    ready = true;

    // Invite link opened in the browser (yourdomain/invite/<code>): prefill the code.
    const m = window.location.pathname.match(/^\/invite\/([A-Za-z0-9_-]+)/);
    if (m) {
      history.replaceState(null, "", "/");
      showScreen(SCREENS.PARTNER, { inviteCode: m[1] });
    }

    const isNativeBuild = window.Capacitor?.isNativePlatform?.();
    if (!isNativeBuild && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  });
</script>

{#if !ready}
  <div class="boot-screen">
    <span class="numeral boot-numeral">84</span>
  </div>
{:else if user.needsOnboarding}
  <Onboarding />
{:else}
  {#if router.screen === SCREENS.DASHBOARD}    <Dashboard />
  {:else if router.screen === SCREENS.GOALS}   <Goals />
  {:else if router.screen === SCREENS.VISION}  <Vision />
  {:else if router.screen === SCREENS.SETTINGS}<Settings />
  {:else if router.screen === SCREENS.CYCLE_REVIEW} <CycleReview />
  {:else if router.screen === SCREENS.PAST_CYCLES}  <PastCycles />
  {:else if router.screen === SCREENS.YEAR_REVIEW}  <YearInReview />
  {:else if router.screen === SCREENS.PARTNER} <Partner />
  {:else if router.screen === SCREENS.PAYWALL} <Paywall />
  {:else if router.screen === SCREENS.PARTNER_STATS} <PartnerStats />
  {:else if router.screen === SCREENS.LEGAL} <Legal />
  {/if}

  {#if NAV_SCREENS.has(router.screen)}
    <NavBar />
  {/if}
{/if}

<style>
  .boot-screen {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
  }
  .boot-numeral { font-size: var(--text-4xl); font-weight: 700; color: var(--ink); letter-spacing: -0.04em; }
</style>
