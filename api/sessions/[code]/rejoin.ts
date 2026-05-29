import type { VercelRequest, VercelResponse } from "@vercel/node";
import { reconnectParticipant } from "../../lib/membership.js";
import { getUserFromRequest } from "../../lib/requestAuth.js";
import { rejoinCampaign } from "../../lib/sessions.js";
import { getSessionByCode, saveSession } from "../../lib/store.js";

/** POST /api/sessions/:code/rejoin — ruta dedicada (evita fallos del catch-all en Vercel) */
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
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Inicia sesión para reingresar" });
    }

    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });
    }

    const result = rejoinCampaign(session, user.id, user.displayName);
    if (!result.ok) {
      return res.status(403).json(result);
    }

    const me = session.participants.find((p) => p.id === result.you?.participantId);
    if (me) reconnectParticipant(me);
    await saveSession(session);

    return res.status(200).json(result);
  } catch (err) {
    console.error(`POST /api/sessions/${code}/rejoin`, err);
    const message = err instanceof Error ? err.message : "Error al reingresar";
    return res.status(500).json({ ok: false, error: message });
  }
}
