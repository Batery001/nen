import type { GameSession } from "../../lib/types.js";
import * as mongo from "../../lib/db/sessions.js";
import { isMongoConfigured } from "../../lib/db/client.js";

const sessions = new Map<string, GameSession>();
const codeToSessionId = new Map<string, string>();

export function usingMongo(): boolean {
  return isMongoConfigured();
}

async function withMongoFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (!usingMongo()) return fallback();
  try {
    return await operation();
  } catch (err) {
    console.error("MongoDB falló, usando memoria:", err);
    return fallback();
  }
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
  await withMongoFallback(
    () => mongo.saveSession(session),
    async () => {
      sessions.set(session.id, session);
      codeToSessionId.set(session.code, session.id);
    }
  );
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  return withMongoFallback(
    () => mongo.getSessionByCode(code),
    async () => {
      const id = codeToSessionId.get(code.toUpperCase().trim());
      return id ? sessions.get(id) : undefined;
    }
  );
}

export async function deleteSessionIfEmpty(session: GameSession): Promise<void> {
  if (session.participants.length > 0) return;
  await withMongoFallback(
    () => mongo.deleteSessionById(session.id),
    async () => {
      sessions.delete(session.id);
      codeToSessionId.delete(session.code);
    }
  );
}
