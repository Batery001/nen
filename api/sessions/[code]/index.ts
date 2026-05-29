import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionByCode } from "../../lib/store.js";
import { toSnapshot } from "../../lib/sessions.js";

/** GET /api/sessions/:code */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const code = (req.query.code as string)?.toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: "Código requerido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });
    }
    return res.status(200).json(toSnapshot(session));
  } catch (err) {
    console.error(`GET /api/sessions/${code}`, err);
    return res.status(500).json({ error: "Error al cargar la partida" });
  }
}
