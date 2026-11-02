export const SCREENS = {
  ONBOARDING: "onboarding",
  DASHBOARD: "dashboard",
  GOALS: "goals",
  VISION: "vision",
  SETTINGS: "settings",
  CYCLE_REVIEW: "cycle_review",
  PAST_CYCLES: "past_cycles",
  YEAR_REVIEW: "year_review",
  PARTNER: "partner",
  PAYWALL: "paywall",
  PARTNER_STATS: "partner_stats",
  LEGAL: "legal",
};

let screen = $state(SCREENS.DASHBOARD);
let screenParam = $state(null);
let previousScreen = $state(SCREENS.DASHBOARD);
let activeModal = $state(null);
let modalDraft = $state(null);

export function routerState() {
  return {
    get screen() { return screen; },
    get param() { return screenParam; },
    get previous() { return previousScreen; },
    get activeModal() { return activeModal; },
    get modalDraft() { return modalDraft; },
  };
}

export function showScreen(id, param = null) {
  closeModal();
  if (id !== screen) previousScreen = screen;
  screen = id;
  screenParam = param;
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
