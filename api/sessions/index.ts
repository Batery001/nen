/**
 * GET /api/sessions — explorar (?mine=1) | hub (?action=hub&code=&participantId=)
 * POST /api/sessions — crear | rejoin (?action=rejoin&code=)
 * PATCH /api/sessions — hub master (?action=hub&code=&participantId=)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureOwnerParticipant } from "../lib/membership.js";
import { getUserFromRequest } from "../lib/requestAuth.js";
import {
  handleHubGetRequest,
  handleHubPatchRequest,
  handleRejoinRequest,
  handleUploadAudioRequest,
  handleUploadCampaignAudioRequest,
  handleAttachAudioUrlRequest,
} from "../lib/sessionRoutes.js";
import { createSessionData, toSnapshot } from "../lib/sessions.js";
import type { JoinRequest } from "../lib/types.js";
import { getSessionByCode, listSessionItems, saveSession, usingMongo } from "../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const code = typeof req.query.code === "string" ? req.query.code.toUpperCase().trim() : "";
  const participantId =
    typeof req.query.participantId === "string" ? req.query.participantId : undefined;

  if (action === "hub" && code && participantId) {
    try {
      if (req.method === "GET") {
        await handleHubGetRequest(req, res, code, participantId);
        return;
      }
      if (req.method === "PATCH") {
        await handleHubPatchRequest(req, res, code, participantId);
        return;
      }
      res.setHeader("Allow", "GET, PATCH");
      return res.status(405).json({ error: "Método no permitido" });
    } catch (err) {
      console.error("hub via /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error";
      return res.status(500).json({ error: message });
    }
  }

  if (action === "rejoin" && code) {
    try {
      await handleRejoinRequest(req, res, code);
      return;
    } catch (err) {
      console.error("rejoin via /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error al reingresar";
      return res.status(500).json({ ok: false, error: message });
    }
  }

  const playSessionId =
    typeof req.query.playSessionId === "string" ? req.query.playSessionId : undefined;

  if (action === "upload-audio" && code && playSessionId) {
    try {
      await handleUploadAudioRequest(req, res, code, playSessionId);
      return;
    } catch (err) {
      console.error("upload-audio via /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error al subir";
      return res.status(500).json({ ok: false, error: message });
    }
  }

  if (action === "upload-campaign-audio" && code && participantId) {
    try {
      await handleUploadCampaignAudioRequest(req, res, code);
      return;
    } catch (err) {
      console.error("upload-campaign-audio via /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error al subir";
      return res.status(500).json({ ok: false, error: message });
    }
  }

  if (action === "attach-audio" && code && participantId) {
    try {
      await handleAttachAudioUrlRequest(req, res, code, playSessionId);
      return;
    } catch (err) {
      console.error("attach-audio via /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error al adjuntar";
      return res.status(500).json({ ok: false, error: message });
    }
  }

  if (req.method === "GET") {
    try {
      const mine = req.query.mine === "1" || req.query.mine === "true";
      if (mine) {
        const user = await getUserFromRequest(req);
        if (!user) {
          return res.status(401).json({
            ok: false,
            error: "Inicia sesión para ver tus campañas",
          });
        }
        const items = await listSessionItems({ memberUserId: user.id });
        return res.status(200).json({ sessions: items });
      }
      const items = await listSessionItems({ explore: true });
      return res.status(200).json({ sessions: items });
    } catch (err) {
      console.error("GET /api/sessions", err);
      const message = err instanceof Error ? err.message : "Error al listar mesas";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const user = await getUserFromRequest(req);
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as JoinRequest;
    const name = body?.name?.trim();

    if (name) {
      if (!user) {
        return res.status(401).json({
          ok: false,
          error: "Inicia sesión para crear una campaña",
        });
      }

      let session = createSessionData(user.id);
      while (await getSessionByCode(session.code)) {
        session = createSessionData(user.id);
      }

      const participant = ensureOwnerParticipant(session, user.id, name);
      await saveSession(session);

      const saved = await getSessionByCode(session.code);
      if (!saved) {
        return res.status(500).json({
          ok: false,
          error: "No se pudo guardar la partida en MongoDB. Revisa MONGODB_URI y Network Access (0.0.0.0/0).",
        });
      }

      return res.status(201).json({
        ok: true,
        session: toSnapshot(session),
        you: { participantId: participant.id, role: "master" as const },
      });
    }

    let session = createSessionData(user?.id);
    while (await getSessionByCode(session.code)) {
      session = createSessionData(user?.id);
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
