import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyMasterPatch, buildHubView, requireMaster } from "./hub.js";
import { reconnectParticipant } from "./membership.js";
import { ensureHubFields } from "./migrate.js";
import { getUserFromRequest } from "./requestAuth.js";
import { rejoinCampaign } from "./sessions.js";
import type { HubMasterPatch } from "./types.js";
import { getSessionByCode, saveSession } from "./store.js";

export async function handleRejoinRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ ok: false, error: "Inicia sesión para reingresar" });
    return;
  }

  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ ok: false, error: "Partida no encontrada" });
    return;
  }

  const result = rejoinCampaign(session, user.id, user.displayName);
  if (!result.ok) {
    res.status(403).json(result);
    return;
  }

  const me = session.participants.find((p) => p.id === result.you?.participantId);
  if (me) reconnectParticipant(me);
  await saveSession(session);
  res.setHeader("X-Niku-Route", "sessions-index-rejoin");
  res.status(200).json(result);
}

export async function handleHubGetRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  participantId: string
): Promise<void> {
  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
  if (!hub) {
    res.status(403).json({ error: "No estás en esta mesa" });
    return;
  }

  const me = session.participants.find((p) => p.id === participantId);
  if (me) {
    reconnectParticipant(me);
    await saveSession(session);
  }

  res.setHeader("X-Niku-Route", "sessions-index-hub");
  res.status(200).json(buildHubView(session, participantId, user?.id));
}

export async function handleHubPatchRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  participantId: string
): Promise<void> {
  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    res.status(403).json({ error: "Solo el master puede editar la campaña" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as HubMasterPatch;
  applyMasterPatch(session, body);
  await saveSession(session);
  res.setHeader("X-Niku-Route", "sessions-index-hub-patch");
  res.status(200).json(buildHubView(session, participantId, user?.id));
}
