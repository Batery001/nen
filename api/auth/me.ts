import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest } from "../lib/requestAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: "No autenticado" });
  }
  return res.status(200).json({ ok: true, user });
}
