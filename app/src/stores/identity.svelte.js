/**
 * Identity statement + Vision categories store.
 */
import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { createIdentity, KEYS } from "../lib/schema.js";
import { dateKey } from "../lib/time.js";

let identity = $state(null);
let visionDismissDate = $state(null);

export function identityState() {
  return {
    get identity() { return identity; },
    get statement() { return identity?.statement ?? ""; },
    get categories() { return identity?.categories ?? []; },
    get visionDismissedToday() {
      return visionDismissDate === dateKey(new Date());
    },
  };
}

export async function loadIdentity() {
  identity = await storageGetJSON(KEYS.IDENTITY, createIdentity());
  visionDismissDate = await storageGetJSON(KEYS.VISION_DISMISS, null);
}

export async function updateStatement(statement) {
  identity = { ...(identity ?? createIdentity()), statement };
  await storageSetJSON(KEYS.IDENTITY, identity);
}

export async function updateCategoryText(id, text) {
  if (!identity) return;
  identity = {
    ...identity,
    categories: identity.categories.map(c => c.id === id ? { ...c, text } : c),
  };
  await storageSetJSON(KEYS.IDENTITY, identity);
}

export async function updateCategoryName(id, name) {
  if (!identity) return;
  identity = {
    ...identity,
    categories: identity.categories.map(c => c.id === id ? { ...c, name } : c),
  };
  await storageSetJSON(KEYS.IDENTITY, identity);
}

export async function addCategory(name = "New Category") {
  if (!identity) return;
  const newCat = {
    id: crypto.randomUUID(),
    name,
    text: "",
    order: identity.categories.length,
  };
  identity = { ...identity, categories: [...identity.categories, newCat] };
  await storageSetJSON(KEYS.IDENTITY, identity);
}

export async function removeCategory(id) {
  if (!identity) return;
  identity = {
    ...identity,
    categories: identity.categories.filter(c => c.id !== id),
  };
  await storageSetJSON(KEYS.IDENTITY, identity);
}

export async function dismissVisionBanner() {
  visionDismissDate = dateKey(new Date());
  await storageSetJSON(KEYS.VISION_DISMISS, visionDismissDate);
}

export async function wipeIdentity() {
  identity = createIdentity();
  await storageSetJSON(KEYS.IDENTITY, identity);
}
