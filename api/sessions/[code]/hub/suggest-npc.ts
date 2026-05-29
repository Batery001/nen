import type { VercelRequest, VercelResponse } from "@vercel/node";
import { suggestNpcFromWiki } from "../../../lib/ai/suggestNpc.js";
import { requireMaster } from "../../../lib/hub.js";
import { getUserFromRequest } from "../../../lib/requestAuth.js";
import { getSessionByCode } from "../../../lib/store.js";

/** POST /api/sessions/:code/hub/suggest-npc */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const code = (req.query.code as string)?.toUpperCase().trim();
  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    participantId?: string;
    hint?: string;
  };
  const participantId = body.participantId;

  if (!code || !participantId) {
    return res.status(400).json({ error: "participantId requerido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    const user = await getUserFromRequest(req);
    if (!requireMaster(session, participantId, user?.id)) {
      return res.status(403).json({ error: "Solo el master puede usar la IA" });
    }

    const suggestion = await suggestNpcFromWiki(session, body.hint);
    return res.status(200).json({ ok: true, suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error IA";
    return res.status(400).json({ ok: false, error: message });
  }
}
