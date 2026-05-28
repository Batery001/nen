import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestLoginCode } from "../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, displayName } = body as { email?: string; displayName?: string };
    if (!email?.trim()) {
      return res.status(400).json({ ok: false, error: "Email requerido" });
    }

    const result = await requestLoginCode(email, displayName?.trim());
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.status(200).json({
      ok: true,
      message: "Revisa tu email para el código de acceso",
      devCode: result.devCode,
    });
  } catch (err) {
    console.error("request-code", err);
    return res.status(500).json({ ok: false, error: "Error al enviar código" });
  }
}
