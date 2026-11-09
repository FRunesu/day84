<script>
  import { SCREENS, showScreen, routerState } from "../stores/router.svelte.js";
  const router = routerState();
  const items = [
    { id: SCREENS.DASHBOARD, label: "Home" },
    { id: SCREENS.GOALS,     label: "Goals" },
    { id: SCREENS.VISION,    label: "Vision" },
    { id: SCREENS.SETTINGS,  label: "Settings" },
  ];
</script>

<nav class="navbar">
  {#each items as item}
    <button
      class="nav-item"
      class:active={router.screen === item.id}
      onclick={() => showScreen(item.id)}
      aria-current={router.screen === item.id ? "page" : undefined}
    >
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  .navbar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--max-width);
    height: calc(var(--nav-height) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    display: flex;
    background: var(--bg);
    border-top: 1px solid var(--border);
    z-index: 30;
  }
  .nav-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-faint);
    transition: color var(--duration-fast) var(--ease-out);
  }
  .nav-item.active { color: var(--ink); }
  .label { font-size: 12px; font-weight: 500; }
  .nav-item.active .label { font-weight: 600; }
</style>
