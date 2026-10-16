import { storageGetJSON, storageSetJSON, storageRemove } from "../lib/storage.js";
import { SCHEMA_VERSION, KEYS } from "../lib/schema.js";

let profile = $state(null);
let loaded = $state(false);

export function userState() {
  return {
    get profile() { return profile; },
    get loaded() { return loaded; },
    get needsOnboarding() { return loaded && (!profile || !profile.onboardingComplete); },
  };
}

export async function loadUser() {
  const stored = await storageGetJSON(KEYS.USER, null);
  profile = stored;
  loaded = true;
  return profile;
}

export async function completeOnboarding({ name, currentIdentity = "", ageBracket = "13_plus" }) {
  const p = {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    currentIdentity,
    ageBracket,
    onboardingComplete: true,
  };
  profile = p;
  await storageSetJSON(KEYS.USER, p);
  return p;
}

export async function updateProfile(patch) {
  if (!profile) return null;
  profile = { ...profile, ...patch };
  await storageSetJSON(KEYS.USER, profile);
  return profile;
}

export async function wipeLocalUser() {
  await storageRemove(KEYS.USER);
  profile = null;
  loaded = true; // keep loaded=true so needsOnboarding fires and routes to onboarding
}
