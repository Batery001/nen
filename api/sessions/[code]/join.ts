import type { VercelRequest, VercelResponse } from "@vercel/node";
import { joinSessionData } from "../../lib/sessions.js";
import type { JoinRequest } from "../../lib/types.js";
import { getSessionByCode, saveSession } from "../../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Código requerido" });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });
    }

    const result = joinSessionData(session, req.body as JoinRequest);
    if (result.ok && (result.you || result.pending)) await saveSession(session);
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error("POST /api/sessions/:code/join", err);
    const message = err instanceof Error ? err.message : "Error al unirse";
    return res.status(500).json({ ok: false, error: message });
  }
}
