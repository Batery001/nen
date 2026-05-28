import type { GameSession, SessionListItem } from "../../lib/types.js";
import { toListItem } from "./lib/sessions.js";
import * as mongo from "../../lib/db/sessions.js";
import { isMongoConfigured } from "../../lib/db/client.js";

const sessions = new Map<string, GameSession>();
const codeToSessionId = new Map<string, string>();

function normalizeSession(session: GameSession): GameSession {
  session.code = session.code.toUpperCase().trim();
  return session;
}

export function usingMongo(): boolean {
  return isMongoConfigured();
}

export async function initStore(): Promise<void> {
  if (!usingMongo()) return;
  try {
    await mongo.ensureIndexes();
  } catch (err) {
    console.error("No se pudieron crear índices MongoDB:", err);
  }
}

export async function saveSession(session: GameSession): Promise<void> {
  normalizeSession(session);

  if (usingMongo()) {
    await mongo.saveSession(session);
    return;
  }

  sessions.set(session.id, session);
  codeToSessionId.set(session.code, session.id);
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  const normalized = code.toUpperCase().trim();

  if (usingMongo()) {
    return mongo.getSessionByCode(normalized);
  }

  const id = codeToSessionId.get(normalized);
  return id ? sessions.get(id) : undefined;
}

export async function listSessionItems(): Promise<SessionListItem[]> {
  if (usingMongo()) {
    const all = await mongo.listSessions();
    return all.map((s) => toListItem(s));
  }

  return [...sessions.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => toListItem(s));
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
