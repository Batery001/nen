import type { GameSession, JoinResponse, PendingJoinRequest } from "./types.js";
import { ensureHubFields } from "./migrate.js";
import { addParticipant, toSnapshot } from "./sessions.js";

export function ensurePendingRequests(session: GameSession): PendingJoinRequest[] {
  const s = ensureHubFields(session);
  if (!s.pendingJoinRequests) s.pendingJoinRequests = [];
  return s.pendingJoinRequests;
}

export function createPlayerJoinRequest(
  session: GameSession,
  name: string
): JoinResponse {
  const s = ensureHubFields(session);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  const pending = ensurePendingRequests(s);
  const alreadyPlayer = s.participants.some(
    (p) => p.role === "player" && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyPlayer) {
    return { ok: false, error: "Ya hay un jugador con ese nombre en la mesa" };
  }

  const duplicatePending = pending.find(
    (r) =>
      r.status === "pending" && r.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicatePending) {
    return {
      ok: true,
      pending: true,
      requestId: duplicatePending.id,
      session: toSnapshot(s),
    };
  }

  const request: PendingJoinRequest = {
    id: crypto.randomUUID(),
    name: trimmed,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  pending.push(request);

  return {
    ok: true,
    pending: true,
    requestId: request.id,
    session: toSnapshot(s),
  };
}

export function getJoinRequestStatus(
  session: GameSession,
  requestId: string
): JoinResponse {
  const s = ensureHubFields(session);
  const request = ensurePendingRequests(s).find((r) => r.id === requestId);
  if (!request) {
    return { ok: false, error: "Solicitud no encontrada" };
  }

  if (request.status === "pending") {
    return { ok: true, pending: true, requestId: request.id, session: toSnapshot(s) };
  }

  if (request.status === "rejected") {
    return { ok: false, error: "El master rechazó tu solicitud" };
  }

  const participant = s.participants.find((p) => p.id === request.participantId);
  if (!participant) {
    return { ok: false, error: "Solicitud aprobada pero participante no encontrado" };
  }

  return {
    ok: true,
    session: toSnapshot(s),
    you: { participantId: participant.id, role: participant.role },
  };
}

export function resolveJoinRequest(
  session: GameSession,
  requestId: string,
  action: "approve" | "reject"
): JoinResponse {
  const s = ensureHubFields(session);
  const pending = ensurePendingRequests(s);
  const index = pending.findIndex((r) => r.id === requestId);
  if (index === -1) {
    return { ok: false, error: "Solicitud no encontrada" };
  }

  const request = pending[index];
  if (request.status !== "pending") {
    return { ok: false, error: "Esta solicitud ya fue procesada" };
  }

  if (action === "reject") {
    request.status = "rejected";
    request.resolvedAt = new Date().toISOString();
    return { ok: true, session: toSnapshot(s) };
  }

  const joinResult = addParticipant(s, request.name, "player");
  if (!joinResult.ok || !joinResult.you) {
    return joinResult;
  }

  request.status = "approved";
  request.resolvedAt = new Date().toISOString();
  request.participantId = joinResult.you.participantId;

  return { ok: true, session: toSnapshot(s) };
}
