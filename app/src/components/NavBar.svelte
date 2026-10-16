<script>
  import { SCREENS, showScreen, routerState } from "../stores/router.svelte.js";
  const router = routerState();
  const items = [
    { id: SCREENS.DASHBOARD, icon: "◷", label: "Home" },
    { id: SCREENS.TODAY,     icon: "☑", label: "Today" },
    { id: SCREENS.GOALS,     icon: "◎", label: "Goals" },
    { id: SCREENS.VISION,    icon: "✦", label: "Vision" },
    { id: SCREENS.SETTINGS,  icon: "⚙", label: "Settings" },
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
      <span class="icon" aria-hidden="true">{item.icon}</span>
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
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    z-index: 30;
  }
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--ink-faint);
    transition: color var(--duration-fast) var(--ease-out);
  }
  .nav-item.active { color: var(--accent); }
  .icon { font-size: var(--text-lg); line-height: 1; }
  .label { font-size: 10px; font-weight: 500; letter-spacing: 0.02em; }
</style>
