/**
 * POST /api/sessions — archivo en raíz de /api para máxima compatibilidad con Vercel
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionData, joinSessionData, toSnapshot } from "./lib/sessions.js";
import type { JoinRequest } from "./lib/types.js";
import { getSessionByCode, saveSession, usingMongo } from "./lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    let session = createSessionData();
    while (await getSessionByCode(session.code)) {
      session = createSessionData();
    }

    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as JoinRequest;
    const name = body?.name?.trim();

    if (name) {
      const result = joinSessionData(session, {
        name,
        role: body.role ?? "master",
        sessionId: session.id,
      });
      if (!result.ok) {
        return res.status(400).json(result);
      }
      await saveSession(session);
      const saved = await getSessionByCode(session.code);
      if (!saved) {
        return res.status(500).json({
          ok: false,
          error: "No se pudo guardar la partida en MongoDB. Revisa MONGODB_URI y Network Access (0.0.0.0/0).",
        });
      }
      return res.status(201).json(result);
    }

    await saveSession(session);
    if (usingMongo() && !(await getSessionByCode(session.code))) {
      return res.status(500).json({
        ok: false,
        error: "No se pudo guardar en MongoDB. Revisa MONGODB_URI en Vercel.",
      });
    }
    return res.status(201).json(toSnapshot(session));
  } catch (err) {
    console.error("POST /api/sessions", err);
    const message = err instanceof Error ? err.message : "Error al crear la partida";
    return res.status(500).json({ ok: false, error: message });
  }
}
