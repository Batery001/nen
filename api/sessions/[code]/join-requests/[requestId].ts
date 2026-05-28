import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getJoinRequestStatus,
  resolveJoinRequest,
} from "../../../lib/joinRequests.js";
import { requireMaster } from "../../../lib/hub.js";
import { getUserFromRequest } from "../../../lib/requestAuth.js";
import { getSessionByCode, saveSession } from "../../../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const requestId = req.query.requestId as string;

  if (!code || !requestId) {
    return res.status(400).json({ error: "code y requestId requeridos" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });
    }

    if (req.method === "GET") {
      const result = getJoinRequestStatus(session, requestId);
      return res.status(result.ok ? 200 : 404).json(result);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { action, participantId } = body as {
        action?: "approve" | "reject";
        participantId?: string;
      };

      if (!participantId || !action) {
        return res.status(400).json({ error: "participantId y action requeridos" });
      }
      const user = await getUserFromRequest(req);
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ ok: false, error: "Solo el master puede gestionar solicitudes" });
      }

      const result = resolveJoinRequest(session, requestId, action);
      if (result.ok) await saveSession(session);
      return res.status(result.ok ? 200 : 400).json(result);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("join-requests handler", err);
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ ok: false, error: message });
  }
}
