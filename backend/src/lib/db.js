/**
 * Day84 Backend — Data Layer
 * ------------------------------------------------------------------
 * DEV/DEMO IMPLEMENTATION: a JSON file on disk so the whole backend
 * runs with zero external dependencies. Swap this module for a real
 * managed database before shipping at scale; every function is a
 * small async unit so that swap is a drop-in.
 *
 * Tables (see schema.sql for the Postgres equivalent):
 *   invites     — { id, token, inviterId, inviterName, recipientEmail, status, createdAt, expiresAt }
 *   links       — { id, userAId, userAName, userBId, userBName, createdAt }  (one row = one partnership)
 *   sharedData  — keyed by userId: { userName, sharePrefs, streaks, bestStreak, dayScore, cycleProgress, goalText, visionText, updatedAt }
 *   pushes      — { id, fromId, fromName, toId, createdAt }  (removed once delivered)
 */

import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

export const MAX_PARTNERS = 6;

const EMPTY_DB = { invites: [], links: [], sharedData: {}, pushes: [] };

async function ensureDataFile() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) await writeFile(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2));
}

async function readDb() {
  return serialized(readDbNow);
}

async function readDbNow() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const db = JSON.parse(raw);
  for (const k of Object.keys(EMPTY_DB)) if (db[k] === undefined) db[k] = structuredClone(EMPTY_DB[k]);
  return db;
}

// Atomic write (temp file + rename) so a concurrent reader never sees a
// half-written file; plus a simple queue so read-modify-write sequences
// from concurrent requests don't clobber each other.
async function writeDb(db) {
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DATA_FILE);
}

let queue = Promise.resolve();
function serialized(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function mutate(fn) {
  return serialized(async () => {
    const db = await readDbNow();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
}

// ---- Invites ----

export async function createInvite(invite) {
  return mutate((db) => { db.invites.push(invite); return invite; });
}

export async function findInviteByToken(token) {
  const db = await readDb();
  return db.invites.find((i) => i.token === token) || null;
}

export async function findInvitesByInviter(inviterId) {
  const db = await readDb();
  return db.invites.filter((i) => i.inviterId === inviterId);
}

export async function updateInviteStatus(token, status, patch = {}) {
  return mutate((db) => {
    const invite = db.invites.find((i) => i.token === token);
    if (invite) Object.assign(invite, patch, { status });
    return invite || null;
  });
}

// ---- Links (partnerships) ----

function involves(link, userId) {
  return link.userAId === userId || link.userBId === userId;
}

export async function createLink(a, b) {
  return mutate((db) => {
    const exists = db.links.find((l) => involves(l, a.id) && involves(l, b.id));
    if (exists) return exists;
    const link = {
      id: `${a.id}:${b.id}:${Date.now()}`,
      userAId: a.id,
      userAName: a.name,
      userBId: b.id,
      userBName: b.name,
      createdAt: new Date().toISOString(),
    };
    db.links.push(link);
    return link;
  });
}

export async function findLinksForUser(userId) {
  const db = await readDb();
  return db.links.filter((l) => involves(l, userId));
}

export async function countLinksForUser(userId) {
  return (await findLinksForUser(userId)).length;
}

export async function removeLink(userId, partnerId) {
  return mutate((db) => {
    const before = db.links.length;
    db.links = db.links.filter((l) => !(involves(l, userId) && involves(l, partnerId)));
    db.pushes = db.pushes.filter((p) => !((p.fromId === userId && p.toId === partnerId) || (p.fromId === partnerId && p.toId === userId)));
    return before !== db.links.length;
  });
}

export async function removeLinksForUser(userId) {
  return mutate((db) => {
    const before = db.links.length;
    db.links = db.links.filter((l) => !involves(l, userId));
    db.pushes = db.pushes.filter((p) => p.fromId !== userId && p.toId !== userId);
    return before !== db.links.length;
  });
}

export function partnerFromLink(link, selfId) {
  if (!link) return null;
  return link.userAId === selfId
    ? { id: link.userBId, name: link.userBName }
    : { id: link.userAId, name: link.userAName };
}

// ---- Shared data (the privacy-filtered sync payload) ----

export async function upsertSharedData(userId, payload) {
  return mutate((db) => {
    db.sharedData[userId] = { ...payload, updatedAt: new Date().toISOString() };
    // Keep the display name on every link current too.
    if (payload.userName) {
      for (const l of db.links) {
        if (l.userAId === userId) l.userAName = payload.userName;
        if (l.userBId === userId) l.userBName = payload.userName;
      }
    }
    return db.sharedData[userId];
  });
}

export async function getSharedData(userId) {
  const db = await readDb();
  return db.sharedData[userId] || null;
}

export async function deleteSharedData(userId) {
  return mutate((db) => { delete db.sharedData[userId]; });
}

// ---- Pushes ("Push <partner>") ----

export async function createPush(push) {
  return mutate((db) => { db.pushes.push(push); return push; });
}

/** Returns and removes every pending push addressed to this user. */
export async function takePushesFor(userId) {
  return mutate((db) => {
    const mine = db.pushes.filter((p) => p.toId === userId);
    db.pushes = db.pushes.filter((p) => p.toId !== userId);
    return mine;
  });
}

export async function recentPushCount(fromId, toId, windowMs) {
  const db = await readDb();
  const since = Date.now() - windowMs;
  return db.pushes.filter((p) => p.fromId === fromId && p.toId === toId && new Date(p.createdAt).getTime() > since).length;
}

// ---- Full account deletion cascade ----

export async function deleteAccountCascade(userId) {
  return mutate((db) => {
    delete db.sharedData[userId];
    db.links = db.links.filter((l) => !involves(l, userId));
    db.invites = db.invites.filter((i) => i.inviterId !== userId);
    db.pushes = db.pushes.filter((p) => p.fromId !== userId && p.toId !== userId);
  });
}
