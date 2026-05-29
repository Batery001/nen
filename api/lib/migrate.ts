import type { GameSession } from "./types.js";

export function ensureHubFields(session: GameSession): GameSession {
  if (!session.campaignTitle) session.campaignTitle = "Campaña sin título";
  if (session.campaignSummary === undefined) session.campaignSummary = "";
  if (session.campaignAudioUrl === undefined) session.campaignAudioUrl = "";
  if (!session.wiki) session.wiki = [];
  if (!session.characters) session.characters = [];
  if (!session.playSessions) session.playSessions = [];
  if (!session.pendingJoinRequests) session.pendingJoinRequests = [];
  if (!session.visibility) session.visibility = "public";
  for (const p of session.participants) {
    if (p.connected === undefined) p.connected = true;
  }
  for (const ps of session.playSessions) {
    if (!ps.transcriptStatus) ps.transcriptStatus = "idle";
  }
  return session;
}
