import type { GameSession } from "../types.js";
import { getDb } from "./client.js";

const COLLECTION = "sessions";

export async function saveSession(session: GameSession): Promise<void> {
  const db = await getDb();
  await db
    .collection<GameSession>(COLLECTION)
    .updateOne({ id: session.id }, { $set: session }, { upsert: true });
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  const db = await getDb();
  const doc = await db
    .collection<GameSession>(COLLECTION)
    .findOne({ code: code.toUpperCase().trim() });
  return doc ?? undefined;
}

export async function deleteSessionById(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listSessions(filter: Record<string, unknown> = {}): Promise<GameSession[]> {
  const db = await getDb();
  return db
    .collection<GameSession>(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
}
