import type { GameSession } from "./lib/types.js";

const sessions = new Map<string, GameSession>();
const codeToSessionId = new Map<string, string>();

export function saveSession(session: GameSession): void {
  sessions.set(session.id, session);
  codeToSessionId.set(session.code, session.id);
}

export function getSessionByCode(code: string): GameSession | undefined {
  const id = codeToSessionId.get(code.toUpperCase().trim());
  return id ? sessions.get(id) : undefined;
}

export function deleteSessionIfEmpty(session: GameSession): void {
  if (session.participants.length === 0) {
    sessions.delete(session.id);
    codeToSessionId.delete(session.code);
  }
}
