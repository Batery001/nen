import type { GameSession } from "./types.js";

export function ensureHubFields(session: GameSession): GameSession {
  if (!session.campaignTitle) session.campaignTitle = "Campaña sin título";
  if (session.campaignSummary === undefined) session.campaignSummary = "";
  if (session.campaignAudioUrl === undefined) session.campaignAudioUrl = "";
  if (!session.wiki) session.wiki = [];
  if (!session.characters) session.characters = [];
  if (!session.playSessions) session.playSessions = [];
  if (!session.pendingJoinRequests) session.pendingJoinRequests = [];
  return session;
}
