<script>
  let { title = "", onClose = () => {}, children } = $props();
</script>

<div class="backdrop" onclick={onClose} role="presentation">
  <div
    class="sheet"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === "Escape" && onClose()}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
  >
    <div class="sheet-header">
      <h2>{title}</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
    </div>
    <div class="sheet-body">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    animation: fadeIn var(--duration-fast) var(--ease-out);
  }

  .sheet {
    width: 100%;
    max-width: var(--max-width);
    background: var(--bg-elevated);
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    border: 1px solid var(--border);
    border-bottom: none;
    padding: var(--space-5);
    padding-bottom: calc(var(--space-6) + var(--safe-bottom));
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp var(--duration-base) var(--ease-out);
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .sheet-header h2 {
    font-size: var(--text-lg);
    margin: 0;
    color: var(--ink);
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--surface);
    color: var(--ink-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
  }

  .close-btn:hover {
    background: var(--surface-hover);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
