import type { GameSession } from "./types.js";
import * as mongo from "./db/sessions.js";
import { isMongoConfigured } from "./db/client.js";

const memory = globalThis as unknown as {
  __nikuSessions?: Map<string, GameSession>;
  __nikuCodeIndex?: Map<string, string>;
};

function memoryMaps() {
  if (!memory.__nikuSessions) memory.__nikuSessions = new Map();
  if (!memory.__nikuCodeIndex) memory.__nikuCodeIndex = new Map();
  return { sessions: memory.__nikuSessions, codes: memory.__nikuCodeIndex };
}

export function usingMongo(): boolean {
  return isMongoConfigured();
}

export async function saveSession(session: GameSession): Promise<void> {
  if (usingMongo()) {
    await mongo.saveSession(session);
    return;
  }
  const { sessions, codes } = memoryMaps();
  sessions.set(session.id, session);
  codes.set(session.code, session.id);
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  if (usingMongo()) {
    return mongo.getSessionByCode(code);
  }
  const normalized = code.toUpperCase().trim();
  const { sessions, codes } = memoryMaps();
  const id = codes.get(normalized);
  return id ? sessions.get(id) : undefined;
}

export async function deleteSessionIfEmpty(session: GameSession): Promise<void> {
  if (session.participants.length > 0) return;
  if (usingMongo()) {
    await mongo.deleteSessionById(session.id);
    return;
  }
  const { sessions, codes } = memoryMaps();
  sessions.delete(session.id);
  codes.delete(session.code);
}
