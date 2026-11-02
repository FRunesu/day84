<script>
  import { setSubscriptionActive } from "../stores/partner.svelte.js";
  import { showScreen, SCREENS } from "../stores/router.svelte.js";

  // NOTE: real purchase flow plugs in here — see docs/deployment-checklist.md
  // for wiring RevenueCat / StoreKit / Play Billing. This stub simulates
  // a successful purchase so the rest of the app's gated UI is testable.
  let purchasing = $state(false);

  async function simulatePurchase(plan) {
    purchasing = true;
    await new Promise((r) => setTimeout(r, 600));
    await setSubscriptionActive(true);
    purchasing = false;
    showScreen(SCREENS.PARTNER);
  }
</script>

<div class="paywall">
  <header class="screen-header">
    <button class="back-btn" onclick={() => showScreen(SCREENS.PARTNER)} aria-label="Back">← Back</button>
  </header>

  <h1>Day84 Plus</h1>
  <p class="lead">Everything in Day84 is free and works fully offline — tasks, streaks, your cycle dashboard, and metrics. Plus adds one thing: a linked accountability partner.</p>

  <ul class="feature-list">
    <li>Invite a real accountability partner by email</li>
    <li>Choose exactly what they can see — private by default</li>
    <li>See their shared progress alongside yours</li>
  </ul>

  <div class="plans">
    <button class="plan" disabled={purchasing} onclick={() => simulatePurchase("monthly")}>
      <span class="plan-name">Monthly</span>
      <span class="plan-price numeral">$4.99/mo</span>
    </button>
    <button class="plan featured" disabled={purchasing} onclick={() => simulatePurchase("annual")}>
      <span class="badge">Best value</span>
      <span class="plan-name">Annual</span>
      <span class="plan-price numeral">$39.99/yr</span>
    </button>
  </div>

  <p class="fine-print">Cancel anytime. Your free features never disappear — only the partner-sync layer is gated.</p>
</div>

<style>
  .paywall {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) var(--space-7);
  }

  .back-btn {
    color: var(--ink-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    margin: 0 0 var(--space-3) 0;
  }

  .lead {
    color: var(--ink-muted);
    font-size: var(--text-base);
    line-height: 1.5;
    margin: 0 0 var(--space-5) 0;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-6) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .feature-list li {
    padding-left: var(--space-5);
    position: relative;
    color: var(--ink);
    font-size: var(--text-sm);
  }

  .feature-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 700;
  }

  .plans {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }

  .plan {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    position: relative;
  }

  .plan.featured {
    border-color: var(--accent);
  }

  .badge {
    position: absolute;
    top: -10px;
    left: var(--space-3);
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .plan-name {
    font-size: var(--text-sm);
    color: var(--ink-muted);
  }

  .plan-price {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--ink);
  }

  .fine-print {
    font-size: var(--text-xs);
    color: var(--ink-faint);
    text-align: center;
  }
</style>
