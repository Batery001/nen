import type { GameSession } from "./types.js";

const memory = globalThis as unknown as {
  __nenSessions?: Map<string, GameSession>;
  __nenCodeIndex?: Map<string, string>;
};

function memoryMaps() {
  if (!memory.__nenSessions) memory.__nenSessions = new Map();
  if (!memory.__nenCodeIndex) memory.__nenCodeIndex = new Map();
  return { sessions: memory.__nenSessions, codes: memory.__nenCodeIndex };
}

export async function saveSession(session: GameSession): Promise<void> {
  const { sessions, codes } = memoryMaps();
  sessions.set(session.id, session);
  codes.set(session.code, session.id);
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  const normalized = code.toUpperCase().trim();
  const { sessions, codes } = memoryMaps();
  const id = codes.get(normalized);
  return id ? sessions.get(id) : undefined;
}
