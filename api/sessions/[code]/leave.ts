import type { VercelRequest, VercelResponse } from "@vercel/node";
import { campaignShouldPersist } from "../../lib/membership.js";
import { leaveSessionData, toSnapshot } from "../../lib/sessions.js";
import { deleteSessionIfEmpty, getSessionByCode, saveSession } from "../../lib/store.js";

/** POST /api/sessions/:code/leave */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const code = (req.query.code as string)?.toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: "Código requerido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    const { participantId } = (typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body) as { participantId?: string };

    if (!participantId) {
      return res.status(400).json({ error: "participantId requerido" });
    }

    leaveSessionData(session, participantId);
    await saveSession(session);

    if (!campaignShouldPersist(session) && session.participants.length === 0) {
      await deleteSessionIfEmpty(session);
      return res.status(200).json({ ok: true, removed: true, disconnected: true });
    }

    return res.status(200).json({
      ok: true,
      disconnected: true,
      session: toSnapshot(session),
    });
  } catch (err) {
    console.error(`POST /api/sessions/${code}/leave`, err);
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
}
