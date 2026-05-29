import type { GameSession } from "./types.js";
import { toListItem } from "./sessions.js";
import type { SessionListItem } from "./types.js";
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

function normalizeSession(session: GameSession): GameSession {
  session.code = session.code.toUpperCase().trim();
  return session;
}

export function usingMongo(): boolean {
  return isMongoConfigured();
}

export async function saveSession(session: GameSession): Promise<void> {
  normalizeSession(session);

  if (usingMongo()) {
    await mongo.saveSession(session);
    return;
  }

  const { sessions, codes } = memoryMaps();
  sessions.set(session.id, session);
  codes.set(session.code, session.id);
}

export async function getSessionByCode(code: string): Promise<GameSession | undefined> {
  const normalized = code.toUpperCase().trim();

  if (usingMongo()) {
    return mongo.getSessionByCode(normalized);
  }

  const { sessions, codes } = memoryMaps();
  const id = codes.get(normalized);
  return id ? sessions.get(id) : undefined;
}

export async function listSessionItems(options?: {
  visibility?: "public";
  explore?: boolean;
  memberUserId?: string;
}): Promise<SessionListItem[]> {
  const viewerId = options?.memberUserId;

  if (usingMongo()) {
    const filter: Record<string, unknown> = {};
    if (options?.visibility) filter.visibility = options.visibility;
    if (options?.explore) {
      filter.visibility = "public";
    }
    if (viewerId) {
      filter.$or = [
        { ownerUserId: viewerId },
        { participants: { $elemMatch: { userId: viewerId } } },
      ];
    }
    const all = await mongo.listSessions(filter);
    return all.map((s) => toListItem(s, viewerId));
  }

  const { sessions } = memoryMaps();
  let list = [...sessions.values()];
  if (options?.visibility) {
    list = list.filter((s) => (s.visibility ?? "public") === options.visibility);
  }
  if (options?.explore) {
    list = list.filter((s) => (s.visibility ?? "public") === "public");
  }
  if (viewerId) {
    list = list.filter(
      (s) =>
        s.ownerUserId === viewerId ||
        s.participants.some((p) => p.userId === viewerId)
    );
  }
  return list
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((s) => toListItem(s, viewerId));
}

export async function deleteSessionIfEmpty(session: GameSession): Promise<void> {
  const { campaignShouldPersist } = await import("./membership.js");
  if (campaignShouldPersist(session)) return;
  if (session.participants.length > 0) return;

  if (usingMongo()) {
    await mongo.deleteSessionById(session.id);
    return;
  }

  const { sessions, codes } = memoryMaps();
  sessions.delete(session.id);
  codes.delete(session.code);
}
