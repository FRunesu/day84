/**
 * Anvil Backend — Postgres Data Layer
 * ------------------------------------------------------------------
 * Used when DATABASE_URL is set (e.g. a free Neon or Supabase
 * database). Same exports and behaviour as db-json.js. Tables are
 * created on startup if missing; see schema.sql.
 */

import pg from "pg";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const MAX_PARTNERS = 6;

const url = process.env.DATABASE_URL;
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const pool = new pg.Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 5,
});

const schema = await readFile(path.join(__dirname, "../../schema.sql"), "utf-8");
await pool.query(schema);

const q = (text, params) => pool.query(text, params);
const iso = (d) => (d ? new Date(d).toISOString() : d);

// ---- Invites ----

function toInvite(r) {
  if (!r) return null;
  return {
    id: r.id,
    token: r.token,
    inviterId: r.inviter_id,
    inviterName: r.inviter_name,
    recipientEmail: r.recipient_email,
    status: r.status,
    createdAt: iso(r.created_at),
    expiresAt: iso(r.expires_at),
    acceptedById: r.accepted_by_id || undefined,
    acceptedByName: r.accepted_by_name || undefined,
  };
}

export async function createInvite(invite) {
  await q(
    `INSERT INTO invites (id, token, inviter_id, inviter_name, recipient_email, status, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [invite.id, invite.token, invite.inviterId, invite.inviterName, invite.recipientEmail, invite.status, invite.createdAt, invite.expiresAt]
  );
  return invite;
}

export async function findInviteByToken(token) {
  const { rows } = await q(`SELECT * FROM invites WHERE token = $1`, [token]);
  return toInvite(rows[0]);
}

export async function findInvitesByInviter(inviterId) {
  const { rows } = await q(`SELECT * FROM invites WHERE inviter_id = $1 ORDER BY created_at`, [inviterId]);
  return rows.map(toInvite);
}

export async function updateInviteStatus(token, status, patch = {}) {
  const { rows } = await q(
    `UPDATE invites SET status = $2,
       accepted_by_id = COALESCE($3, accepted_by_id),
       accepted_by_name = COALESCE($4, accepted_by_name)
     WHERE token = $1 RETURNING *`,
    [token, status, patch.acceptedById ?? null, patch.acceptedByName ?? null]
  );
  return toInvite(rows[0]);
}

// ---- Links (partnerships) ----

function toLink(r) {
  return {
    id: r.id,
    userAId: r.user_a_id,
    userAName: r.user_a_name,
    userBId: r.user_b_id,
    userBName: r.user_b_name,
    createdAt: iso(r.created_at),
  };
}

const PAIR = `((user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1))`;

export async function createLink(a, b) {
  await q(
    `INSERT INTO links (id, user_a_id, user_a_name, user_b_id, user_b_name)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [`${a.id}:${b.id}:${Date.now()}`, a.id, a.name, b.id, b.name]
  );
  const { rows } = await q(`SELECT * FROM links WHERE ${PAIR}`, [a.id, b.id]);
  return toLink(rows[0]);
}

export async function findLinksForUser(userId) {
  const { rows } = await q(`SELECT * FROM links WHERE user_a_id = $1 OR user_b_id = $1 ORDER BY created_at`, [userId]);
  return rows.map(toLink);
}

export async function countLinksForUser(userId) {
  const { rows } = await q(`SELECT count(*)::int AS n FROM links WHERE user_a_id = $1 OR user_b_id = $1`, [userId]);
  return rows[0].n;
}

export async function removeLink(userId, partnerId) {
  const res = await q(`DELETE FROM links WHERE ${PAIR}`, [userId, partnerId]);
  await q(`DELETE FROM pushes WHERE (from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1)`, [userId, partnerId]);
  return res.rowCount > 0;
}

export async function removeLinksForUser(userId) {
  const res = await q(`DELETE FROM links WHERE user_a_id = $1 OR user_b_id = $1`, [userId]);
  await q(`DELETE FROM pushes WHERE from_id = $1 OR to_id = $1`, [userId]);
  return res.rowCount > 0;
}

export function partnerFromLink(link, selfId) {
  if (!link) return null;
  return link.userAId === selfId
    ? { id: link.userBId, name: link.userBName }
    : { id: link.userAId, name: link.userAName };
}

// ---- Shared data (the privacy-filtered sync payload) ----

export async function upsertSharedData(userId, payload) {
  const { rows } = await q(
    `INSERT INTO shared_data (user_id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
     RETURNING data, updated_at`,
    [userId, JSON.stringify(payload)]
  );
  if (payload.userName) {
    await q(`UPDATE links SET user_a_name = $2 WHERE user_a_id = $1`, [userId, payload.userName]);
    await q(`UPDATE links SET user_b_name = $2 WHERE user_b_id = $1`, [userId, payload.userName]);
  }
  return { ...rows[0].data, updatedAt: iso(rows[0].updated_at) };
}

export async function getSharedData(userId) {
  const { rows } = await q(`SELECT data, updated_at FROM shared_data WHERE user_id = $1`, [userId]);
  return rows[0] ? { ...rows[0].data, updatedAt: iso(rows[0].updated_at) } : null;
}

export async function deleteSharedData(userId) {
  await q(`DELETE FROM shared_data WHERE user_id = $1`, [userId]);
}

// ---- Pushes ("Push <partner>") ----

export async function createPush(push) {
  await q(
    `INSERT INTO pushes (id, from_id, from_name, to_id, created_at) VALUES ($1,$2,$3,$4,$5)`,
    [push.id, push.fromId, push.fromName, push.toId, push.createdAt]
  );
  return push;
}

/** Returns and removes every pending push addressed to this user. */
export async function takePushesFor(userId) {
  const { rows } = await q(`DELETE FROM pushes WHERE to_id = $1 RETURNING *`, [userId]);
  return rows
    .sort((a, b) => a.created_at - b.created_at)
    .map((r) => ({ id: r.id, fromId: r.from_id, fromName: r.from_name, toId: r.to_id, createdAt: iso(r.created_at) }));
}

/**
 * Pushes are deleted once delivered, so — like the JSON store — this
 * only counts pushes still waiting to be read.
 */
export async function recentPushCount(fromId, toId, windowMs) {
  const { rows } = await q(
    `SELECT count(*)::int AS n FROM pushes WHERE from_id = $1 AND to_id = $2 AND created_at > $3`,
    [fromId, toId, new Date(Date.now() - windowMs).toISOString()]
  );
  return rows[0].n;
}

// ---- Full account deletion cascade ----

export async function deleteAccountCascade(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM shared_data WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM links WHERE user_a_id = $1 OR user_b_id = $1`, [userId]);
    await client.query(`DELETE FROM invites WHERE inviter_id = $1`, [userId]);
    await client.query(`DELETE FROM pushes WHERE from_id = $1 OR to_id = $1`, [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
