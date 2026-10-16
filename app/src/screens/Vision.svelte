<script>
  import { identityState, updateStatement, updateCategoryText, updateCategoryName, addCategory, removeCategory } from "../stores/identity.svelte.js";

  const id = identityState();
  let editingStatement = $state(false);
  let draftStatement = $state("");

  function startEditStatement() {
    draftStatement = id.statement;
    editingStatement = true;
  }

  async function saveStatement() {
    await updateStatement(draftStatement.trim());
    editingStatement = false;
  }
</script>

<div class="vision-screen">
  <header class="screen-header">
    <h1>Vision Board</h1>
  </header>

  <!-- Identity Declaration -->
  <section class="identity-section">
    <div class="section-label">Identity Declaration</div>
    <p class="section-hint">Every tactic you complete is a vote for the person you are working to become. The clearer your identity, the more powerful the daily action.</p>

    {#if editingStatement}
      <div class="identity-edit">
        <span class="identity-prefix">I am…</span>
        <textarea rows="3" bind:value={draftStatement} placeholder="a marathon runner who shows up every day…"></textarea>
        <div class="edit-actions">
          <button class="btn-ghost" onclick={() => (editingStatement = false)}>Cancel</button>
          <button class="btn-primary" onclick={saveStatement}>Save</button>
        </div>
      </div>
    {:else}
      <div class="identity-display" onclick={startEditStatement} role="button" tabindex="0" onkeydown={e => e.key === "Enter" && startEditStatement()}>
        <span class="identity-prefix">I am…</span>
        <span class="identity-text">{id.statement || "Tap to write your identity statement"}</span>
        <span class="edit-hint">tap to edit</span>
      </div>
    {/if}
  </section>

  <!-- Vision Categories -->
  <section class="categories-section">
    <div class="section-label">Long-Term Vision</div>
    <p class="section-hint">Write where you want to be in each area of your life. Review this regularly.</p>

    <div class="categories">
      {#each id.categories as cat (cat.id)}
        <div class="category-card">
          <div class="cat-header">
            <input
              class="cat-name-input"
              type="text"
              value={cat.name}
              onblur={e => updateCategoryName(cat.id, e.target.value)}
              onkeydown={e => e.key === "Enter" && e.target.blur()}
            />
            <button class="remove-cat" onclick={() => removeCategory(cat.id)} aria-label="Remove {cat.name}">✕</button>
          </div>
          <textarea
            rows="4"
            value={cat.text}
            oninput={e => updateCategoryText(cat.id, e.target.value)}
            placeholder="Describe your vision for {cat.name.toLowerCase()}…"
          ></textarea>
        </div>
      {/each}
    </div>

    <button class="add-category-btn" onclick={() => addCategory()}>+ Add category</button>
  </section>
</div>

<style>
  .vision-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  h1 { font-size: var(--text-xl); margin: 0; }
  .section-label {
    font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--ink-muted); margin-bottom: var(--space-2);
  }
  .section-hint { font-size: var(--text-sm); color: var(--ink-faint); margin: 0 0 var(--space-4) 0; }

  .identity-section { display: flex; flex-direction: column; }
  .identity-prefix { font-size: var(--text-sm); color: var(--accent); font-weight: 600; margin-bottom: var(--space-2); display: block; }

  .identity-display {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: var(--space-4); cursor: pointer; display: flex; flex-direction: column; gap: var(--space-2);
  }
  .identity-text { font-size: var(--text-base); color: var(--ink); font-style: italic; }
  .edit-hint { font-size: var(--text-xs); color: var(--ink-faint); }

  .identity-edit { display: flex; flex-direction: column; gap: var(--space-3); }
  .identity-edit textarea { padding: var(--space-3); border-radius: var(--radius-md); resize: none; }
  .edit-actions { display: flex; gap: var(--space-3); }
  .btn-primary { flex: 1; background: var(--accent); color: var(--accent-ink); font-weight: 600; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); }
  .btn-ghost { color: var(--ink-muted); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); }

  .categories { display: flex; flex-direction: column; gap: var(--space-4); }
  .category-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .cat-header { display: flex; justify-content: space-between; align-items: center; }
  .cat-name-input {
    font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--ink-muted); background: transparent; border: none; outline: none; padding: 0; width: 100%;
  }
  .cat-name-input:focus { color: var(--accent); }
  .remove-cat { color: var(--ink-faint); font-size: var(--text-xs); flex-shrink: 0; }
  .category-card textarea {
    padding: var(--space-3); border-radius: var(--radius-sm); resize: none;
    font-size: var(--text-sm); line-height: 1.6;
  }
  .add-category-btn {
    color: var(--accent); font-size: var(--text-sm); font-weight: 600;
    padding: var(--space-3) 0; text-align: left; margin-top: var(--space-2);
  }
</style>
