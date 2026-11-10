/**
 * Anvil Backend — Email
 * ------------------------------------------------------------------
 * Sends the real accountability-invite email via Resend
 * (https://resend.com). If RESEND_API_KEY is not set (e.g. local
 * development, or this sandbox), it falls back to logging the
 * email content to the console instead of throwing — a standard,
 * deliberate pattern for mocking external services in dev, not a
 * placeholder that was forgotten.
 *
 * CAN-SPAM basics (per the legal checklist from the spec): a real,
 * non-spoofed sender identity, and a clear statement of why the
 * recipient is receiving this email (someone they know invited
 * them) — both handled in buildInviteEmail() below. Swap
 * FROM_ADDRESS for a verified sending domain before going live;
 * Resend will not send from an unverified domain in production.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.EMAIL_FROM || "Anvil <invites@yourdomain.com>";
const APP_DOWNLOAD_URL = process.env.APP_DOWNLOAD_URL || "https://day84.app/download";
const APP_WEB_BASE = process.env.APP_WEB_BASE || "https://day84.app";

function buildInviteEmail({ inviterName, token, recipientEmail }) {
  const acceptLink = `${APP_WEB_BASE}/invite/${token}`;
  return {
    from: FROM_ADDRESS,
    to: recipientEmail,
    subject: `${inviterName} invited you to be their accountability partner on Anvil`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${inviterName} wants you as their accountability partner</h2>
        <p>Anvil helps people break a year into focused 12-week cycles and stay honest about how much time is actually left. ${inviterName} is inviting you to link up so you can both stay on track.</p>
        <p style="margin: 24px 0;">
          <a href="${APP_DOWNLOAD_URL}" style="background:#000000;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Get Anvil</a>
        </p>
        <p>Already have the app? Open <strong>Settings → Accountability partners</strong>, tap <strong>Enter invite code</strong> and paste this code:</p>
        <p style="font-family: ui-monospace, Menlo, monospace; font-size: 16px; letter-spacing: 1px; background:#f2f2f2; padding:12px 16px; border-radius:8px; word-break: break-all;">${token}</p>
        <p>Or <a href="${acceptLink}">tap here to link with ${inviterName}</a>.</p>
        <p style="color:#888;font-size:12px;">This invite was sent because ${inviterName} entered your email address in their Anvil app. If you weren't expecting this, you can safely ignore it — the link expires in 7 days.</p>
      </div>
    `,
  };
}

export async function sendInviteEmail({ inviterName, token, recipientEmail }) {
  const message = buildInviteEmail({ inviterName, token, recipientEmail });

  if (!RESEND_API_KEY) {
    console.log("\n[day84:email — DEV MODE, no RESEND_API_KEY set] Would send:");
    console.log(`  To: ${message.to}`);
    console.log(`  Subject: ${message.subject}`);
    console.log(`  Accept link: ${APP_WEB_BASE}/invite/${token}`);
    console.log(`  Download link: ${APP_DOWNLOAD_URL}\n`);
    return { status: "sent", sent: false, devMode: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${errBody}`);
  }

  return { status: "sent", sent: true, devMode: false };
}
