import type { GameSession } from "../types.js";
import { getDb } from "./client.js";

const COLLECTION = "sessions";

export async function saveSession(session: GameSession): Promise<void> {
  const db = await getDb();
  const col = db.collection<GameSession>(COLLECTION);
  await col.updateOne({ id: session.id }, { $set: session }, { upsert: true });
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  const db = await getDb();
  const normalized = code.toUpperCase().trim();
  const doc = await db.collection<GameSession>(COLLECTION).findOne({ code: normalized });
  return doc ?? undefined;
}

export async function deleteSessionById(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listSessions(
  filter: Record<string, unknown> = {}
): Promise<GameSession[]> {
  const db = await getDb();
  return db
    .collection<GameSession>(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).createIndex({ code: 1 }, { unique: true });
  await db.collection(COLLECTION).createIndex({ id: 1 }, { unique: true });
}
