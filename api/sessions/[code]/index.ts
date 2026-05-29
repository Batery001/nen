import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleRejoinRequest } from "../../lib/sessionRoutes.js";
import { getSessionByCode } from "../../lib/store.js";
import { toSnapshot } from "../../lib/sessions.js";

function pathname(req: VercelRequest): string {
  const url = req.url ?? "";
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    const q = url.indexOf("?");
    return q >= 0 ? url.slice(0, q) : url;
  }
}

/** GET /api/sessions/:code — también rescata POST .../rejoin si Vercel enruta mal */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = (req.query.code as string)?.toUpperCase().trim();
  if (code && pathname(req).endsWith("/rejoin") && req.method === "POST") {
    try {
      await handleRejoinRequest(req, res, code);
      return;
    } catch (err) {
      console.error(`POST /api/sessions/${code}/rejoin (via index)`, err);
      return res.status(500).json({ ok: false, error: "Error al reingresar" });
    }
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

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
