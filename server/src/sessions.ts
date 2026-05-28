import { customAlphabet } from "nanoid";
import type { GameSession, Participant, Role, SessionSnapshot } from "./types.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const sessions = new Map<string, GameSession>();
const codeToSessionId = new Map<string, string>();

export function createSession(): GameSession {
  let code = generateCode();
  while (codeToSessionId.has(code)) {
    code = generateCode();
  }

  const session: GameSession = {
    id: crypto.randomUUID(),
    code,
    createdAt: new Date().toISOString(),
    participants: [],
  };

  sessions.set(session.id, session);
  codeToSessionId.set(code, session.id);
  return session;
}

export function getSessionByCode(code: string): GameSession | undefined {
  const id = codeToSessionId.get(code.toUpperCase().trim());
  return id ? sessions.get(id) : undefined;
}

export function getSessionById(id: string): GameSession | undefined {
  return sessions.get(id);
}

function hasRole(session: GameSession, role: Role): boolean {
  return session.participants.some((p) => p.role === role);
}

export function canJoinWithRole(session: GameSession, role: Role): boolean {
  if (role === "master" && hasRole(session, "master")) {
    return false;
  }
  return true;
}

export function toSnapshot(session: GameSession): SessionSnapshot {
  return {
    id: session.id,
    code: session.code,
    createdAt: session.createdAt,
    participants: session.participants.map(({ socketId: _, ...rest }) => rest),
    rolesAvailable: {
      master: !hasRole(session, "master"),
      player: true,
      observer: true,
    },
  };
}

export function addParticipant(
  sessionId: string,
  participant: Participant
): SessionSnapshot | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (!canJoinWithRole(session, participant.role)) return null;

  session.participants.push(participant);
  return toSnapshot(session);
}

export function removeParticipantBySocket(socketId: string): SessionSnapshot | null {
  for (const session of sessions.values()) {
    const index = session.participants.findIndex((p) => p.socketId === socketId);
    if (index !== -1) {
      session.participants.splice(index, 1);
      if (session.participants.length === 0) {
        sessions.delete(session.id);
        codeToSessionId.delete(session.code);
        return null;
      }
      return toSnapshot(session);
    }
  }
  return null;
}

export function findSessionBySocket(socketId: string): GameSession | undefined {
  for (const session of sessions.values()) {
    if (session.participants.some((p) => p.socketId === socketId)) {
      return session;
    }
  }
  return undefined;
}
