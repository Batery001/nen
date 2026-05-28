import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest } from "../lib/requestAuth.js";
import { listSessionItems } from "../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Inicia sesión para ver tus campañas" });
  }

  try {
    const sessions = await listSessionItems({ memberUserId: user.id });
    return res.status(200).json({ sessions });
  } catch (err) {
    console.error("campaigns/mine", err);
    return res.status(500).json({ error: "Error al cargar campañas" });
  }
}
