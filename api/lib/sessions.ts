import { customAlphabet } from "nanoid";
import type { GameSession, JoinRequest, JoinResponse, Participant, Role, SessionSnapshot } from "./types.js";
import { ensureHubFields } from "./migrate.js";
import { ensureCharacter } from "./hub.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function hasRole(session: GameSession, role: Role): boolean {
  return session.participants.some((p) => p.role === role);
}

export function toSnapshot(session: GameSession): SessionSnapshot {
  const s = ensureHubFields(session);
  return {
    id: s.id,
    code: s.code,
    createdAt: s.createdAt,
    participants: [...s.participants],
    rolesAvailable: {
      master: !hasRole(s, "master"),
      player: true,
      observer: true,
    },
  };
}

export function createSessionData(): GameSession {
  return ensureHubFields({
    id: crypto.randomUUID(),
    code: generateCode(),
    createdAt: new Date().toISOString(),
    participants: [],
    campaignTitle: "Nueva campaña",
    campaignSummary: "",
    campaignAudioUrl: "",
    wiki: [],
    characters: [],
    playSessions: [],
  });
}

export function joinSessionData(session: GameSession, payload: JoinRequest): JoinResponse {
  const s = ensureHubFields(session);
  const name = payload.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  if (payload.sessionId && payload.sessionId !== s.id) {
    return { ok: false, error: "Partida no encontrada" };
  }

  if (payload.role === "master" && hasRole(s, "master")) {
    return { ok: false, error: "Ya hay un master en esta partida" };
  }

  const participant: Participant = {
    id: crypto.randomUUID(),
    name,
    role: payload.role,
    connectedAt: new Date().toISOString(),
  };

  s.participants.push(participant);
  if (payload.role === "player") {
    ensureCharacter(s, participant);
  }

  return {
    ok: true,
    session: toSnapshot(s),
    you: { participantId: participant.id, role: payload.role },
  };
}

export function leaveSessionData(session: GameSession, participantId: string): SessionSnapshot | null {
  const s = ensureHubFields(session);
  const index = s.participants.findIndex((p) => p.id === participantId);
  if (index === -1) return toSnapshot(s);
  s.participants.splice(index, 1);
  return toSnapshot(s);
}
