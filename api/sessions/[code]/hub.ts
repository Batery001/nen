import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCharacterPatch,
  applyMasterPatch,
  buildHubView,
  requireMaster,
} from "../../lib/hub.js";
import { ensureHubFields } from "../../lib/migrate.js";
import type { CharacterPatch, HubMasterPatch } from "../../lib/types.js";
import { getUserFromRequest } from "../../lib/requestAuth.js";
import { reconnectParticipant } from "../../lib/membership.js";
import { getSessionByCode, saveSession } from "../../lib/store.js";

function parseBody<T>(req: VercelRequest): T {
  return (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as T;
}

function participantIdFrom(req: VercelRequest): string | undefined {
  const q = req.query.participantId;
  if (typeof q === "string") return q;
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const participantId = participantIdFrom(req);
  if (!code || !participantId) {
    return res.status(400).json({ error: "code y participantId requeridos" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) return res.status(404).json({ error: "Partida no encontrada" });

    const user = await getUserFromRequest(req);
    const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
    if (!hub) return res.status(403).json({ error: "No estás en esta mesa" });

    if (req.method === "GET") {
      const me = session.participants.find((p) => p.id === participantId);
      if (me) {
        reconnectParticipant(me);
        await saveSession(session);
      }
      const fresh = buildHubView(session, participantId, user?.id);
      return res.status(200).json(fresh);
    }

    if (req.method === "PATCH") {
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ error: "Solo el master puede editar la campaña" });
      }
      applyMasterPatch(session, parseBody<HubMasterPatch>(req));
      await saveSession(session);
      const updated = buildHubView(session, participantId, user?.id);
      return res.status(200).json(updated);
    }

    if (req.method === "PUT") {
      const body = parseBody<{ targetParticipantId?: string; patch?: CharacterPatch }>(req);
      const targetId = body.targetParticipantId ?? participantId;
      const result = applyCharacterPatch(
        session,
        participantId,
        targetId,
        body.patch ?? {}
      );
      if (!result.ok) return res.status(403).json({ error: result.error });
      await saveSession(session);
      const updated = buildHubView(session, participantId, user?.id);
      return res.status(200).json(updated);
    }

    res.setHeader("Allow", "GET, PATCH, PUT");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("hub handler", err);
    const message = err instanceof Error ? err.message : "Error en el hub";
    return res.status(500).json({ error: message });
  }
}
