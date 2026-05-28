import type { GameSession, Participant, Role } from "./types.js";
import { ensureHubFields } from "./migrate.js";

export function isParticipantConnected(p: Participant): boolean {
  return p.connected !== false;
}

export function findParticipantById(
  session: GameSession,
  participantId: string
): Participant | undefined {
  return session.participants.find((p) => p.id === participantId);
}

export function findParticipantByUserId(
  session: GameSession,
  userId: string
): Participant | undefined {
  return session.participants.find((p) => p.userId === userId);
}

export function isCampaignOwner(session: GameSession, userId: string | undefined): boolean {
  return Boolean(userId && session.ownerUserId === userId);
}

export function canManageCampaign(
  session: GameSession,
  participantId: string | undefined,
  userId: string | undefined
): boolean {
  if (isCampaignOwner(session, userId)) return true;
  if (!participantId) return false;
  const p = findParticipantById(session, participantId);
  return p?.role === "master";
}

export function canAccessHub(
  session: GameSession,
  participantId: string,
  userId?: string
): boolean {
  const p = findParticipantById(session, participantId);
  if (p) {
    if (!p.userId || !userId || p.userId === userId) return true;
  }
  if (userId && findParticipantByUserId(session, userId)) return true;
  return false;
}

export function disconnectParticipant(session: GameSession, participantId: string): void {
  const p = findParticipantById(session, participantId);
  if (!p) return;

  if (p.role === "observer" && !p.userId && !p.isOwner) {
    const index = session.participants.findIndex((x) => x.id === participantId);
    if (index !== -1) session.participants.splice(index, 1);
    return;
  }

  p.connected = false;
  p.disconnectedAt = new Date().toISOString();
}

export function reconnectParticipant(p: Participant): void {
  p.connected = true;
  p.connectedAt = new Date().toISOString();
  p.disconnectedAt = undefined;
}

export function ensureOwnerParticipant(
  session: GameSession,
  userId: string,
  displayName: string
): Participant {
  const existing = findParticipantByUserId(session, userId);
  if (existing) {
    existing.isOwner = true;
    existing.role = "master";
    existing.name = displayName;
    reconnectParticipant(existing);
    return existing;
  }

  const participant: Participant = {
    id: crypto.randomUUID(),
    name: displayName,
    role: "master",
    connectedAt: new Date().toISOString(),
    connected: true,
    userId,
    isOwner: true,
  };
  session.participants.push(participant);
  session.ownerUserId = userId;
  return participant;
}

export function campaignShouldPersist(session: GameSession): boolean {
  const s = ensureHubFields(session);
  if (s.ownerUserId) return true;
  return s.participants.some((p) => p.role !== "observer" || p.userId);
}
