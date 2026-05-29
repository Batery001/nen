import * as userDb from "./db/users.js";
import type { GameSession, PendingJoinRequest } from "./types.js";

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Niku <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("notify email", err);
    return false;
  }
}

async function sendDiscordWebhook(content: string): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    return res.ok;
  } catch (err) {
    console.error("notify discord", err);
    return false;
  }
}

function appOrigin(): string {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:5173";
}

export async function notifyMasterJoinRequest(
  session: GameSession,
  request: PendingJoinRequest
): Promise<void> {
  const title = session.campaignTitle || "Campaña";
  const hubUrl = `${appOrigin()}/hub/${session.code}`;
  const approveHint = `Código ${session.code} — ${request.name} quiere jugar.`;

  const lines = [
    `🎲 **${title}**`,
    `Nueva solicitud de jugador: **${request.name}**`,
    `Revisa en el hub: ${hubUrl}`,
  ];

  void sendDiscordWebhook(lines.join("\n"));

  if (!session.ownerUserId) return;
  const owner = await userDb.findUserById(session.ownerUserId);
  if (!owner?.email) return;

  void sendEmail(
    owner.email,
    `[Niku] ${request.name} quiere unirse a ${title}`,
    `${approveHint}\n\nEntra al hub para aprobar o rechazar:\n${hubUrl}`
  );
}
