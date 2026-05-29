import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyMasterPatch, buildHubView, requireMaster } from "../../../lib/hub.js";
import { reconnectParticipant } from "../../../lib/membership.js";
import { ensureHubFields } from "../../../lib/migrate.js";
import { getUserFromRequest } from "../../../lib/requestAuth.js";
import type { HubMasterPatch } from "../../../lib/types.js";
import { getSessionByCode, saveSession } from "../../../lib/store.js";

/** GET/PATCH /api/sessions/:code/hub */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = (req.query.code as string)?.toUpperCase().trim();
  const participantId =
    typeof req.query.participantId === "string" ? req.query.participantId : undefined;

  if (!code) {
    return res.status(400).json({ error: "Código requerido" });
  }
  if (!participantId) {
    return res.status(400).json({ error: "participantId requerido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    const user = await getUserFromRequest(req);
    const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
    if (!hub) {
      return res.status(403).json({ error: "No estás en esta mesa" });
    }

    if (req.method === "GET") {
      const me = session.participants.find((p) => p.id === participantId);
      if (me) {
        reconnectParticipant(me);
        await saveSession(session);
      }
      const view = buildHubView(session, participantId, user?.id);
      res.setHeader("X-Niku-Route", "hub-dedicated");
      return res.status(200).json(view);
    }

    if (req.method === "PATCH") {
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ error: "Solo el master puede editar la campaña" });
      }
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as HubMasterPatch;
      applyMasterPatch(session, body);
      await saveSession(session);
      return res.status(200).json(buildHubView(session, participantId, user?.id));
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(`${req.method} /api/sessions/${code}/hub`, err);
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
}
