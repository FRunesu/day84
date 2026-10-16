/**
 * Day84 Backend — Invite Tokens
 * ------------------------------------------------------------------
 * Per the security checklist from the project spec: invite links
 * must be single-use, random, and expiring — never a guessable or
 * permanent identifier. Otherwise a stranger could link themselves
 * to someone else's account simply by guessing/reusing a link.
 */

import { nanoid } from "nanoid";

const TOKEN_LENGTH = 32; // far beyond brute-force range for a 7-day window
const EXPIRY_DAYS = 7;

export function generateInviteToken() {
  return nanoid(TOKEN_LENGTH);
}

export function expiryDate(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + EXPIRY_DAYS);
  return d.toISOString();
}

export function isExpired(invite) {
  return new Date(invite.expiresAt).getTime() < Date.now();
}

export function isUsable(invite) {
  return !!invite && invite.status === "sent" && !isExpired(invite);
}
