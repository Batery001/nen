import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requestLoginCode, revokeToken, verifyLoginCode } from "../lib/auth.js";
import { bearerTokenFromHeader } from "../lib/auth.js";
import { getUserFromRequest } from "../lib/requestAuth.js";

function parseBody(req: VercelRequest): unknown {
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  try {
    if (action === "request-code") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const body = parseBody(req) as { email?: string; displayName?: string };
      if (!body.email?.trim()) {
        return res.status(400).json({ ok: false, error: "Email requerido" });
      }
      const result = await requestLoginCode(body.email, body.displayName?.trim());
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json({
        ok: true,
        message: "Revisa tu email para el código de acceso",
        devCode: result.devCode,
      });
    }

    if (action === "verify-code") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const body = parseBody(req) as { email?: string; code?: string };
      if (!body.email?.trim() || !body.code?.trim()) {
        return res.status(400).json({ ok: false, error: "Email y código requeridos" });
      }
      const result = await verifyLoginCode(body.email, body.code);
      return res.status(result.ok ? 200 : 400).json(result);
    }

    if (action === "me") {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ ok: false, error: "No autenticado" });
      return res.status(200).json({ ok: true, user });
    }

    if (action === "logout") {
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

    return res.status(404).json({ error: "Ruta de auth no encontrada" });
  } catch (err) {
    console.error(`auth/${action}`, err);
    return res.status(500).json({ ok: false, error: "Error en autenticación" });
  }
}
