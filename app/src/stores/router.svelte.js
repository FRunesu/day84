export const SCREENS = {
  ONBOARDING: "onboarding",
  DASHBOARD: "dashboard",
  TODAY: "today",
  GOALS: "goals",
  VISION: "vision",
  SETTINGS: "settings",
  CYCLE_REVIEW: "cycle_review",
  PAST_CYCLES: "past_cycles",
  YEAR_REVIEW: "year_review",
  PARTNER: "partner",
  PAYWALL: "paywall",
};

let screen = $state(SCREENS.DASHBOARD);
let activeModal = $state(null);
let modalDraft = $state(null);

export function routerState() {
  return {
    get screen() { return screen; },
    get activeModal() { return activeModal; },
    get modalDraft() { return modalDraft; },
  };
}

export function showScreen(id) {
  closeModal();
  screen = id;
}

export function openModal(id, draft = null) {
  activeModal = id;
  if (draft !== null) modalDraft = draft;
}

export function closeModal() {
  activeModal = null;
}

export function clearModalDraft() { modalDraft = null; }

export function updateModalDraft(patch) {
  modalDraft = { ...(modalDraft || {}), ...patch };
}
