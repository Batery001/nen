import type { GameSession } from "../../lib/types.js";
import * as mongo from "../../lib/db/sessions.js";
import { isMongoConfigured } from "../../lib/db/client.js";

const sessions = new Map<string, GameSession>();
const codeToSessionId = new Map<string, string>();

export function usingMongo(): boolean {
  return isMongoConfigured();
}

export async function initStore(): Promise<void> {
  if (usingMongo()) {
    await mongo.ensureIndexes();
  }
}

export async function saveSession(session: GameSession): Promise<void> {
  if (usingMongo()) {
    await mongo.saveSession(session);
    return;
  }
  sessions.set(session.id, session);
  codeToSessionId.set(session.code, session.id);
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  if (usingMongo()) {
    return mongo.getSessionByCode(code);
  }
  const id = codeToSessionId.get(code.toUpperCase().trim());
  return id ? sessions.get(id) : undefined;
}

export async function deleteSessionIfEmpty(session: GameSession): Promise<void> {
  if (session.participants.length > 0) return;
  if (usingMongo()) {
    await mongo.deleteSessionById(session.id);
    return;
  }
  sessions.delete(session.id);
  codeToSessionId.delete(session.code);
}
