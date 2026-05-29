import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCharacterPatch,
  applyMasterPatch,
  buildHubView,
  requireMaster,
} from "../../lib/hub.js";
import {
  getJoinRequestStatus,
  resolveJoinRequest,
} from "../../lib/joinRequests.js";
import { campaignShouldPersist, reconnectParticipant } from "../../lib/membership.js";
import { ensureHubFields } from "../../lib/migrate.js";
import { getUserFromRequest } from "../../lib/requestAuth.js";
import {
  joinSessionData,
  leaveSessionData,
  rejoinCampaign,
  toSnapshot,
} from "../../lib/sessions.js";
import { suggestNpcFromWiki } from "../../lib/ai/suggestNpc.js";
import { exportCampaignHtml, exportCampaignMarkdown } from "../../lib/export.js";
import {
  applyPlaySessionProposal,
  processPlaySessionAudio,
  updatePlaySessionProposal,
  uploadPlaySessionAudioFile,
} from "../../lib/sessionAudio.js";
import type {
  CharacterPatch,
  HubMasterPatch,
  JoinRequest,
  SessionAiProposal,
} from "../../lib/types.js";
import { deleteSessionIfEmpty, getSessionByCode, saveSession } from "../../lib/store.js";

function parseBody<T>(req: VercelRequest): T {
  return (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as T;
}

function segmentsFrom(req: VercelRequest): string[] {
  const raw = req.query.rest;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function participantIdFrom(req: VercelRequest): string | undefined {
  const q = req.query.participantId;
  return typeof q === "string" ? q : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Código requerido" });

  const segments = segmentsFrom(req);
  const path = segments.join("/");

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });
    }

    const user = await getUserFromRequest(req);

    // GET /api/sessions/:code
    if (segments.length === 0) {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Método no permitido" });
      }
      return res.status(200).json(toSnapshot(session));
    }

    // POST /api/sessions/:code/join
    if (path === "join") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const body = parseBody<JoinRequest>(req);
      const result = joinSessionData(session, {
        ...body,
        userId: body.userId ?? user?.id,
      });
      if (result.ok && (result.you || result.pending)) await saveSession(session);
      return res.status(result.ok ? 200 : 400).json(result);
    }

    // POST /api/sessions/:code/leave
    if (path === "leave") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const { participantId } = parseBody<{ participantId?: string }>(req);
      if (!participantId) {
        return res.status(400).json({ error: "participantId requerido" });
      }
      leaveSessionData(session, participantId);
      await saveSession(session);
      if (!campaignShouldPersist(session) && session.participants.length === 0) {
        await deleteSessionIfEmpty(session);
        return res.status(200).json({ ok: true, removed: true, disconnected: true });
      }
      return res.status(200).json({
        ok: true,
        disconnected: true,
        session: toSnapshot(session),
      });
    }

    // POST /api/sessions/:code/rejoin
    if (path === "rejoin") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
      }
      if (!user) {
        return res.status(401).json({ ok: false, error: "Inicia sesión para reingresar" });
      }
      const result = rejoinCampaign(session, user.id, user.displayName);
      if (!result.ok) return res.status(403).json(result);
      const me = session.participants.find((p) => p.id === result.you?.participantId);
      if (me) reconnectParticipant(me);
      await saveSession(session);
      return res.status(200).json(result);
    }

    // /api/sessions/:code/join-requests/:requestId
    if (segments[0] === "join-requests" && segments.length === 2) {
      const requestId = segments[1];
      if (req.method === "GET") {
        const result = getJoinRequestStatus(session, requestId);
        return res.status(result.ok ? 200 : 404).json(result);
      }
      if (req.method === "POST") {
        const body = parseBody<{ action?: "approve" | "reject"; participantId?: string }>(req);
        if (!body.participantId || !body.action) {
          return res.status(400).json({ error: "participantId y action requeridos" });
        }
        if (!requireMaster(session, body.participantId, user?.id)) {
          return res.status(403).json({
            ok: false,
            error: "Solo el master puede gestionar solicitudes",
          });
        }
        const result = resolveJoinRequest(session, requestId, body.action);
        if (result.ok) await saveSession(session);
        return res.status(result.ok ? 200 : 400).json(result);
      }
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Método no permitido" });
    }

    // POST .../play-sessions/:id/process-audio | apply-proposal
    if (segments[0] === "play-sessions" && segments.length === 3) {
      const playSessionId = segments[1];
      const action = segments[2];
      const body = parseBody<{
        participantId?: string;
        audioUrl?: string;
        audioBase64?: string;
        audioMimeType?: string;
        transcript?: string;
        proposal?: SessionAiProposal;
      }>(req);

      const participantId = body.participantId ?? participantIdFrom(req);
      if (!participantId) {
        return res.status(400).json({ error: "participantId requerido" });
      }
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ error: "Solo el master puede procesar sesiones" });
      }

      if (action === "process-audio" && req.method === "POST") {
        try {
          const result = await processPlaySessionAudio(session, playSessionId, {
            audioUrl: body.audioUrl,
            audioBase64: body.audioBase64,
            audioMimeType: body.audioMimeType,
            transcript: body.transcript,
          });
          await saveSession(session);
          return res.status(200).json({
            ok: true,
            transcript: result.transcript,
            proposal: result.proposal,
            hub: buildHubView(session, participantId, user?.id),
          });
        } catch (err) {
          await saveSession(session);
          const message = err instanceof Error ? err.message : "Error al procesar";
          return res.status(400).json({ ok: false, error: message });
        }
      }

      if (action === "apply-proposal" && req.method === "POST") {
        try {
          const proposal = applyPlaySessionProposal(
            session,
            playSessionId,
            body.proposal as SessionAiProposal | undefined
          );
          await saveSession(session);
          return res.status(200).json({
            ok: true,
            proposal,
            hub: buildHubView(session, participantId, user?.id),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al aplicar";
          return res.status(400).json({ ok: false, error: message });
        }
      }

      if (action === "update-proposal" && req.method === "POST") {
        const proposal = body.proposal as SessionAiProposal | undefined;
        if (!proposal) {
          return res.status(400).json({ error: "proposal requerida" });
        }
        updatePlaySessionProposal(session, playSessionId, proposal);
        await saveSession(session);
        return res.status(200).json({
          ok: true,
          hub: buildHubView(session, participantId, user?.id),
        });
      }

      if (action === "upload-audio" && req.method === "POST") {
        try {
          if (!body.audioBase64) {
            return res.status(400).json({ error: "audioBase64 requerido" });
          }
          const buffer = Buffer.from(body.audioBase64, "base64");
          const audioUrl = await uploadPlaySessionAudioFile(
            session,
            playSessionId,
            buffer,
            body.audioMimeType ?? "audio/mpeg"
          );
          await saveSession(session);
          return res.status(200).json({
            ok: true,
            audioUrl,
            hub: buildHubView(session, participantId, user?.id),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al subir";
          return res.status(400).json({ ok: false, error: message });
        }
      }

      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método no permitido" });
    }

    if (path === "export") {
      const participantId = participantIdFrom(req);
      if (!participantId) {
        return res.status(400).json({ error: "participantId requerido" });
      }
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ error: "Solo el master puede exportar" });
      }
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const format = (req.query.format as string) ?? "markdown";
      if (format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${session.code}-campana.html"`
        );
        return res.status(200).send(exportCampaignHtml(session));
      }
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${session.code}-campana.md"`
      );
      return res.status(200).send(exportCampaignMarkdown(session));
    }

    if (path === "hub/suggest-npc" && req.method === "POST") {
      const body = parseBody<{ participantId?: string; hint?: string }>(req);
      const participantId = body.participantId ?? participantIdFrom(req);
      if (!participantId) {
        return res.status(400).json({ error: "participantId requerido" });
      }
      if (!requireMaster(session, participantId, user?.id)) {
        return res.status(403).json({ error: "Solo el master puede usar la IA" });
      }
      try {
        const suggestion = await suggestNpcFromWiki(session, body.hint);
        return res.status(200).json({ ok: true, suggestion });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error IA";
        return res.status(400).json({ ok: false, error: message });
      }
    }

    // PUT /api/sessions/:code/hub/character
    if (path === "hub/character") {
      const participantId = participantIdFrom(req);
      if (!participantId) {
        return res.status(400).json({ error: "participantId requerido" });
      }
      if (req.method !== "PUT") {
        res.setHeader("Allow", "PUT");
        return res.status(405).json({ error: "Método no permitido" });
      }
      const body = parseBody<{ targetParticipantId?: string; patch?: CharacterPatch }>(req);
      const result = applyCharacterPatch(
        ensureHubFields(session),
        participantId,
        body.targetParticipantId ?? participantId,
        body.patch ?? {}
      );
      if (!result.ok) return res.status(403).json({ error: result.error });
      await saveSession(session);
      return res.status(200).json(buildHubView(session, participantId, user?.id));
    }

    // GET/PATCH/PUT /api/sessions/:code/hub
    if (path === "hub") {
      const participantId = participantIdFrom(req);
      if (!participantId) {
        return res.status(400).json({ error: "code y participantId requeridos" });
      }
      const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
      if (!hub) return res.status(403).json({ error: "No estás en esta mesa" });

      if (req.method === "GET") {
        const me = session.participants.find((p) => p.id === participantId);
        if (me) {
          reconnectParticipant(me);
          await saveSession(session);
        }
        return res.status(200).json(buildHubView(session, participantId, user?.id));
      }

      if (req.method === "PATCH") {
        if (!requireMaster(session, participantId, user?.id)) {
          return res.status(403).json({ error: "Solo el master puede editar la campaña" });
        }
        applyMasterPatch(session, parseBody<HubMasterPatch>(req));
        await saveSession(session);
        return res.status(200).json(buildHubView(session, participantId, user?.id));
      }

      if (req.method === "PUT") {
        const body = parseBody<{ targetParticipantId?: string; patch?: CharacterPatch }>(req);
        const targetId = body.targetParticipantId ?? participantId;
        const result = applyCharacterPatch(
          session,
          participantId,
          targetId,
          body.patch ?? {}
        );
        if (!result.ok) return res.status(403).json({ error: result.error });
        await saveSession(session);
        return res.status(200).json(buildHubView(session, participantId, user?.id));
      }

      res.setHeader("Allow", "GET, PATCH, PUT");
      return res.status(405).json({ error: "Método no permitido" });
    }

    return res.status(404).json({ error: "Ruta no encontrada" });
  } catch (err) {
    console.error(`sessions/${code}/${path}`, err);
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
}
