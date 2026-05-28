import { customAlphabet } from "nanoid";
import type {
  GameSession,
  JoinRequest,
  JoinResponse,
  Participant,
  Role,
  SessionListItem,
  SessionSnapshot,
} from "./types.js";
import { createPlayerJoinRequest } from "./joinRequests.js";
import { ensureHubFields } from "./migrate.js";
import { ensureCharacter } from "./hub.js";
import {
  disconnectParticipant,
  ensureOwnerParticipant,
  findParticipantByUserId,
  isParticipantConnected,
  reconnectParticipant,
} from "./membership.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function hasActiveMaster(session: GameSession): boolean {
  return session.participants.some((p) => p.role === "master");
}

export function toSnapshot(session: GameSession): SessionSnapshot {
  const s = ensureHubFields(session);
  return {
    id: s.id,
    code: s.code,
    createdAt: s.createdAt,
    participants: s.participants.map((p) => ({ ...p })),
    rolesAvailable: {
      master: !hasActiveMaster(s),
      player: true,
      observer: true,
    },
  };
}

export function createSessionData(ownerUserId?: string): GameSession {
  return ensureHubFields({
    id: crypto.randomUUID(),
    code: generateCode(),
    createdAt: new Date().toISOString(),
    participants: [],
    campaignTitle: "Nueva campaña",
    campaignSummary: "",
    campaignAudioUrl: "",
    wiki: [],
    characters: [],
    playSessions: [],
    ownerUserId,
    visibility: "public",
  });
}

export function toListItem(session: GameSession, viewerUserId?: string): SessionListItem {
  const s = ensureHubFields(session);
  const pending = s.pendingJoinRequests ?? [];
  const mine = viewerUserId ? findParticipantByUserId(s, viewerUserId) : undefined;

  return {
    id: s.id,
    code: s.code,
    campaignTitle: s.campaignTitle,
    createdAt: s.createdAt,
    participantCount: s.participants.filter((p) => p.role !== "observer" || p.userId).length,
    connectedCount: s.participants.filter(isParticipantConnected).length,
    pendingPlayerRequests: pending.filter((r) => r.status === "pending").length,
    visibility: s.visibility ?? "public",
    isOwner: viewerUserId ? s.ownerUserId === viewerUserId : undefined,
    myRole: mine?.role,
  };
}

export function addParticipant(
  session: GameSession,
  name: string,
  role: Role,
  options?: { userId?: string; isOwner?: boolean }
): JoinResponse {
  const s = ensureHubFields(session);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  if (options?.userId) {
    const existing = findParticipantByUserId(s, options.userId);
    if (existing) {
      existing.name = trimmed;
      existing.role = role;
      if (options.isOwner) {
        existing.isOwner = true;
        existing.role = "master";
        s.ownerUserId = options.userId;
      }
      reconnectParticipant(existing);
      if (role === "player") ensureCharacter(s, existing);
      return {
        ok: true,
        session: toSnapshot(s),
        you: { participantId: existing.id, role: existing.role },
      };
    }
  }

  if (role === "master" && hasActiveMaster(s) && !options?.isOwner) {
    return { ok: false, error: "Ya hay un master en esta partida" };
  }

  const participant: Participant = {
    id: crypto.randomUUID(),
    name: trimmed,
    role: options?.isOwner ? "master" : role,
    connectedAt: new Date().toISOString(),
    connected: true,
    userId: options?.userId,
    isOwner: options?.isOwner,
  };

  s.participants.push(participant);
  if (options?.isOwner && options.userId) {
    s.ownerUserId = options.userId;
  }
  if (role === "player" || participant.role === "player") {
    ensureCharacter(s, participant);
  }

  return {
    ok: true,
    session: toSnapshot(s),
    you: { participantId: participant.id, role: participant.role },
  };
}

export function joinSessionData(session: GameSession, payload: JoinRequest): JoinResponse {
  const s = ensureHubFields(session);
  const name = payload.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  if (payload.sessionId && payload.sessionId !== s.id) {
    return { ok: false, error: "Partida no encontrada" };
  }

  if (payload.userId) {
    const existing = findParticipantByUserId(s, payload.userId);
    if (existing && (existing.role === "player" || existing.role === "master")) {
      existing.name = name;
      reconnectParticipant(existing);
      return {
        ok: true,
        session: toSnapshot(s),
        you: { participantId: existing.id, role: existing.role },
      };
    }
  }

  if (payload.role === "player") {
    return createPlayerJoinRequest(s, name, payload.userId);
  }

  return addParticipant(s, name, payload.role, { userId: payload.userId });
}

export function leaveSessionData(session: GameSession, participantId: string): SessionSnapshot | null {
  const s = ensureHubFields(session);
  disconnectParticipant(s, participantId);
  return toSnapshot(s);
}

export function rejoinCampaign(
  session: GameSession,
  userId: string,
  displayName: string
): JoinResponse {
  const s = ensureHubFields(session);

  if (s.ownerUserId === userId) {
    const p = ensureOwnerParticipant(s, userId, displayName);
    return {
      ok: true,
      session: toSnapshot(s),
      you: { participantId: p.id, role: "master" },
    };
  }

  const existing = findParticipantByUserId(s, userId);
  if (existing?.role === "master" && !s.ownerUserId) {
    s.ownerUserId = userId;
    existing.isOwner = true;
    existing.name = displayName;
    reconnectParticipant(existing);
    return {
      ok: true,
      session: toSnapshot(s),
      you: { participantId: existing.id, role: "master" },
    };
  }
  if (!existing) {
    return { ok: false, error: "No tienes membresía en esta campaña" };
  }

  existing.name = displayName;
  reconnectParticipant(existing);
  return {
    ok: true,
    session: toSnapshot(s),
    you: { participantId: existing.id, role: existing.role },
  };
}
