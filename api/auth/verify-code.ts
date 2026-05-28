import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyLoginCode } from "../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, code } = body as { email?: string; code?: string };
    if (!email?.trim() || !code?.trim()) {
      return res.status(400).json({ ok: false, error: "Email y código requeridos" });
    }

    const result = await verifyLoginCode(email, code);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.status(200).json({
      ok: true,
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error("verify-code", err);
    return res.status(500).json({ ok: false, error: "Error al verificar código" });
  }
}
