/**
 * Day84 Backend — Data Layer
 * ------------------------------------------------------------------
 * DEV/DEMO IMPLEMENTATION: this uses a JSON file on disk so the
 * whole backend runs with zero external dependencies and is easy
 * to read end-to-end. It is NOT what should be running in
 * production — swap this module for a real managed database
 * (Postgres via `pg` or an ORM like Prisma/Drizzle) before
 * shipping. Every function below is written as a small, named,
 * already-async unit specifically so that swap is a drop-in:
 * nothing outside this file should need to change.
 *
 * Tables (see schema.sql for the production Postgres equivalent):
 *   users       — minimal identity record (id, name, email)
 *   invites     — { id, token, inviterId, inviterName, recipientEmail, status, createdAt, expiresAt }
 *   links       — { id, userAId, userBId, createdAt }  (one row = one active partnership)
 *   sharedData  — keyed by userId: { sharePrefs, streaks, cycleProgress, goalText, visionText, updatedAt }
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB = { invites: [], links: [], sharedData: {} };

async function ensureDataFile() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) await writeFile(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2));
}

async function readDb() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2));
}

// ---- Invites ----

export async function createInvite(invite) {
  const db = await readDb();
  db.invites.push(invite);
  await writeDb(db);
  return invite;
}

export async function findInviteByToken(token) {
  const db = await readDb();
  return db.invites.find((i) => i.token === token) || null;
}

export async function updateInviteStatus(token, status) {
  const db = await readDb();
  const invite = db.invites.find((i) => i.token === token);
  if (invite) {
    invite.status = status;
    await writeDb(db);
  }
  return invite || null;
}

// ---- Links (partnerships) ----

export async function createLink(userAId, userBId) {
  const db = await readDb();
  // Enforce one active partner per user for this version of the
  // product (matches the spec: "a partner", singular).
  db.links = db.links.filter((l) => l.userAId !== userAId && l.userBId !== userAId);
  const link = { id: `${userAId}:${userBId}:${Date.now()}`, userAId, userBId, createdAt: new Date().toISOString() };
  db.links.push(link);
  await writeDb(db);
  return link;
}

export async function findLinkForUser(userId) {
  const db = await readDb();
  return db.links.find((l) => l.userAId === userId || l.userBId === userId) || null;
}

export async function removeLinksForUser(userId) {
  const db = await readDb();
  const before = db.links.length;
  db.links = db.links.filter((l) => l.userAId !== userId && l.userBId !== userId);
  await writeDb(db);
  return before !== db.links.length;
}

export function partnerIdFromLink(link, selfId) {
  if (!link) return null;
  return link.userAId === selfId ? link.userBId : link.userAId;
}

// ---- Shared data (the privacy-filtered sync payload) ----

export async function upsertSharedData(userId, payload) {
  const db = await readDb();
  db.sharedData[userId] = { ...payload, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.sharedData[userId];
}

export async function getSharedData(userId) {
  const db = await readDb();
  return db.sharedData[userId] || null;
}

export async function deleteSharedData(userId) {
  const db = await readDb();
  delete db.sharedData[userId];
  await writeDb(db);
}

// ---- Full account deletion cascade ----

/**
 * The product rule: deleting an account removes the user's shared
 * data AND immediately breaks/clears the link to their partner, in
 * one operation — no orphaned partner view left behind.
 */
export async function deleteAccountCascade(userId) {
  const db = await readDb();
  delete db.sharedData[userId];
  db.links = db.links.filter((l) => l.userAId !== userId && l.userBId !== userId);
  db.invites = db.invites.filter((i) => i.inviterId !== userId);
  await writeDb(db);
}
