<script>
  import { tasksState, addTask, editTask, deleteTask, toggleTaskToday } from "../stores/tasks.svelte.js";
  import { routerState, openModal, closeModal, updateModalDraft, clearModalDraft } from "../stores/router.svelte.js";
  import TaskItem from "../components/TaskItem.svelte";
  import Modal from "../components/Modal.svelte";

  const tasksStore = tasksState();
  const router = routerState();

  const activeTasks = $derived(tasksStore.tasks.filter((t) => !t.archived));

  const emptyDraft = { id: null, name: "", time: "07:00", durationMinutes: 30, repeat: true };

  function openAddModal() {
    openModal("task-form", { ...emptyDraft });
  }

  function openEditModal(task) {
    openModal("task-form", { ...task });
  }

  async function handleSave() {
    const draft = router.modalDraft;
    if (!draft?.name?.trim()) return;

    if (draft.id) {
      await editTask(draft.id, {
        name: draft.name.trim(),
        time: draft.time,
        durationMinutes: Number(draft.durationMinutes) || 0,
        repeat: !!draft.repeat,
      });
    } else {
      await addTask({
        name: draft.name.trim(),
        time: draft.time,
        durationMinutes: Number(draft.durationMinutes) || 0,
        repeat: !!draft.repeat,
      });
    }
    clearModalDraft();
    closeModal();
  }

  async function handleDelete(taskId) {
    await deleteTask(taskId);
  }

  async function handleToggle(taskId) {
    await toggleTaskToday(taskId);
  }
</script>

<div class="tasks-screen">
  <header class="screen-header">
    <h1>Today's tasks</h1>
    <button class="add-btn" onclick={openAddModal} aria-label="Add task">+</button>
  </header>

  {#if activeTasks.length === 0}
    <div class="empty-state">
      <p>No tasks yet.</p>
      <p class="hint">Add the handful of daily actions that actually move your 12-week goal forward.</p>
    </div>
  {:else}
    <div class="task-list">
      {#each activeTasks as task (task.id)}
        <TaskItem {task} onToggle={handleToggle} onEdit={openEditModal} onDelete={handleDelete} />
      {/each}
    </div>
  {/if}
</div>

{#if router.activeModal === "task-form"}
  <Modal title={router.modalDraft?.id ? "Edit task" : "New task"} onClose={closeModal}>
    <div class="form">
      <label>
        <span>Task name</span>
        <input
          type="text"
          value={router.modalDraft?.name || ""}
          oninput={(e) => updateModalDraft({ name: e.target.value })}
          placeholder="e.g. Morning workout"
        />
      </label>

      <div class="row">
        <label class="half">
          <span>Time</span>
          <input
            type="time"
            value={router.modalDraft?.time || "07:00"}
            oninput={(e) => updateModalDraft({ time: e.target.value })}
          />
        </label>
        <label class="half">
          <span>Duration (min)</span>
          <input
            type="number"
            min="1"
            value={router.modalDraft?.durationMinutes || 30}
            oninput={(e) => updateModalDraft({ durationMinutes: e.target.value })}
          />
        </label>
      </div>

      <label class="toggle-row">
        <span>Repeats daily</span>
        <input
          type="checkbox"
          checked={router.modalDraft?.repeat ?? true}
          onchange={(e) => updateModalDraft({ repeat: e.target.checked })}
        />
      </label>

      <button class="save-btn" onclick={handleSave}>Save task</button>
    </div>
  </Modal>
{/if}

<style>
  .tasks-screen {
    padding: calc(var(--space-5) + var(--safe-top)) var(--space-5) calc(var(--nav-height) + var(--space-6));
  }

  .screen-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
  }

  h1 {
    font-size: var(--text-xl);
    margin: 0;
  }

  .add-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--accent);
    color: var(--accent-ink);
    font-size: var(--text-xl);
    font-weight: 600;
    line-height: 1;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-7) var(--space-4);
    color: var(--ink-muted);
  }

  .hint {
    font-size: var(--text-sm);
    color: var(--ink-faint);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form label {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-muted);
  }

  .form input[type="text"],
  .form input[type="time"],
  .form input[type="number"] {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
  }

  .row {
    display: flex;
    gap: var(--space-3);
  }

  .half {
    flex: 1;
  }

  .toggle-row {
    flex-direction: row !important;
    justify-content: space-between;
    align-items: center;
  }

  .save-btn {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    margin-top: var(--space-2);
  }
</style>
