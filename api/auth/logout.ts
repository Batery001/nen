import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bearerTokenFromHeader, revokeToken } from "../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const header = req.headers.authorization;
  const token = bearerTokenFromHeader(
    typeof header === "string" ? header : header?.[0]
  );
  if (token) await revokeToken(token);
  return res.status(200).json({ ok: true });
}
