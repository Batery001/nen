import type { VercelRequest, VercelResponse } from "@vercel/node";
import { leaveSessionData, toSnapshot } from "../../lib/sessions.js";
import { deleteSessionIfEmpty, getSessionByCode, saveSession } from "../../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Código requerido" });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getSessionByCode(code);
  if (!session) {
    return res.status(404).json({ error: "Partida no encontrada" });
  }

  const { participantId } = req.body as { participantId?: string };
  if (!participantId) {
    return res.status(400).json({ error: "participantId requerido" });
  }

  leaveSessionData(session, participantId);
  await deleteSessionIfEmpty(session);
  if (session.participants.length > 0) {
    await saveSession(session);
    return res.status(200).json(toSnapshot(session));
  }
  return res.status(200).json({ ok: true, removed: true });
}
