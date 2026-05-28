import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toSnapshot } from "../lib/sessions.js";
import { getSessionByCode } from "../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Código requerido" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) return res.status(404).json({ error: "Partida no encontrada" });
    return res.status(200).json(toSnapshot(session));
  } catch (err) {
    console.error("GET /api/sessions/:code", err);
    const message = err instanceof Error ? err.message : "Error al obtener la partida";
    return res.status(500).json({ error: message });
  }
}
