<script>
  import { routerState, showScreen, SCREENS } from "../stores/router.svelte.js";
  const router = routerState();
  const DOCS = {
    privacy: { title: "Privacy Policy", file: "/legal/privacy-policy.html" },
    terms: { title: "Terms of Service", file: "/legal/terms-of-service.html" },
  };
  const doc = $derived(DOCS[router.param] || DOCS.privacy);
  let html = $state("");
  let error = $state("");

  $effect(() => {
    const file = doc.file;
    html = ""; error = "";
    fetch(file)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Couldn't load (${r.status})`))))
      .then((text) => {
        const parsed = new DOMParser().parseFromString(text, "text/html");
        parsed.querySelectorAll("style, script, nav, header").forEach((n) => n.remove());
        parsed.querySelectorAll("a").forEach((a) => { if (/^\s*(←|&larr;)?\s*back/i.test(a.textContent)) a.remove(); });
        parsed.querySelectorAll("[style]").forEach((n) => n.removeAttribute("style"));
        html = parsed.body.innerHTML;
      })
      .catch((e) => (error = e.message));
  });
</script>

<div class="screen">
  <button class="back" onclick={() => showScreen(SCREENS.SETTINGS)}>← Back</button>
  <h1>{doc.title}</h1>
  {#if error}
    <p class="mut">{error}</p>
  {:else if !html}
    <p class="mut">Loading…</p>
  {:else}
    <div class="legal">{@html html}</div>
  {/if}
</div>

<style>
  .screen { padding: calc(var(--space-4) + var(--safe-top)) var(--space-4) var(--space-7); display: flex; flex-direction: column; gap: var(--space-2); }
  .back { align-self: flex-start; color: var(--ink-muted); font-size: var(--text-sm); padding: var(--space-2) 0; }
  h1 { font-size: var(--text-xl); margin: 0 0 var(--space-2); }
  .mut { color: var(--ink-muted); font-size: var(--text-sm); }
  .legal { font-size: var(--text-sm); line-height: 1.6; color: var(--ink-muted); }
  .legal :global(h1) { display: none; }
  .legal :global(h2) { font-size: var(--text-base); color: var(--ink); margin: var(--space-5) 0 var(--space-2); }
  .legal :global(h3) { font-size: var(--text-sm); color: var(--ink); margin: var(--space-4) 0 var(--space-1); }
  .legal :global(p), .legal :global(li) { margin: 0 0 var(--space-2); }
  .legal :global(a) { color: var(--ink); }
  .legal :global(strong) { color: var(--ink); }
</style>
