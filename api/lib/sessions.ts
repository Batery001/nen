import { customAlphabet } from "nanoid";
import type { GameSession, JoinRequest, JoinResponse, Participant, Role, SessionSnapshot } from "./types.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function hasRole(session: GameSession, role: Role): boolean {
  return session.participants.some((p) => p.role === role);
}

export function toSnapshot(session: GameSession): SessionSnapshot {
  return {
    id: session.id,
    code: session.code,
    createdAt: session.createdAt,
    participants: [...session.participants],
    rolesAvailable: {
      master: !hasRole(session, "master"),
      player: true,
      observer: true,
    },
  };
}

export function createSessionData(): GameSession {
  return {
    id: crypto.randomUUID(),
    code: generateCode(),
    createdAt: new Date().toISOString(),
    participants: [],
  };
}

export function joinSessionData(session: GameSession, payload: JoinRequest): JoinResponse {
  const name = payload.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  if (payload.sessionId && payload.sessionId !== session.id) {
    return { ok: false, error: "Partida no encontrada" };
  }

  if (payload.role === "master" && hasRole(session, "master")) {
    return { ok: false, error: "Ya hay un master en esta partida" };
  }

  const participant: Participant = {
    id: crypto.randomUUID(),
    name,
    role: payload.role,
    connectedAt: new Date().toISOString(),
  };

  session.participants.push(participant);

  return {
    ok: true,
    session: toSnapshot(session),
    you: { participantId: participant.id, role: payload.role },
  };
}

export function leaveSessionData(session: GameSession, participantId: string): SessionSnapshot | null {
  const index = session.participants.findIndex((p) => p.id === participantId);
  if (index === -1) return toSnapshot(session);
  session.participants.splice(index, 1);
  return toSnapshot(session);
}
