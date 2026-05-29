import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyMasterPatch, buildHubView, requireMaster } from "./hub.js";
import { reconnectParticipant } from "./membership.js";
import { ensureHubFields } from "./migrate.js";
import { getUserFromRequest } from "./requestAuth.js";
import { rejoinCampaign } from "./sessions.js";
import type { HubMasterPatch } from "./types.js";
import { INLINE_AUDIO_MAX_BYTES, formatAudioSize } from "./audioLimits.js";
import {
  uploadCampaignLevelAudio,
  isBlobConfigured,
  deleteBlobIfHosted,
} from "./blobStorage.js";
import { uploadPlaySessionAudioFile } from "./sessionAudio.js";
import { getSessionByCode, saveSession } from "./store.js";

export async function handleRejoinRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ ok: false, error: "Inicia sesión para reingresar" });
    return;
  }

  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ ok: false, error: "Partida no encontrada" });
    return;
  }

  const result = rejoinCampaign(session, user.id, user.displayName);
  if (!result.ok) {
    res.status(403).json(result);
    return;
  }

  const me = session.participants.find((p) => p.id === result.you?.participantId);
  if (me) reconnectParticipant(me);
  await saveSession(session);
  res.setHeader("X-Niku-Route", "sessions-index-rejoin");
  res.status(200).json(result);
}

export async function handleHubGetRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  participantId: string
): Promise<void> {
  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
  if (!hub) {
    res.status(403).json({ error: "No estás en esta mesa" });
    return;
  }

  const me = session.participants.find((p) => p.id === participantId);
  if (me) {
    reconnectParticipant(me);
    await saveSession(session);
  }

  res.setHeader("X-Niku-Route", "sessions-index-hub");
  res.status(200).json(buildHubView(session, participantId, user?.id));
}

export async function handleHubPatchRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  participantId: string
): Promise<void> {
  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    res.status(403).json({ error: "Solo el master puede editar la campaña" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as HubMasterPatch;
  applyMasterPatch(session, body);
  await saveSession(session);
  res.setHeader("X-Niku-Route", "sessions-index-hub-patch");
  res.status(200).json(buildHubView(session, participantId, user?.id));
}

export async function handleUploadAudioRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  playSessionId: string
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    participantId?: string;
    audioBase64?: string;
    audioMimeType?: string;
  };

  const participantId = body.participantId;
  if (!participantId) {
    res.status(400).json({ error: "participantId requerido" });
    return;
  }

  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    res.status(403).json({ error: "Solo el master puede subir audio" });
    return;
  }

  if (!body.audioBase64) {
    res.status(400).json({ error: "audioBase64 requerido" });
    return;
  }

  try {
    const buffer = Buffer.from(body.audioBase64, "base64");
    if (buffer.byteLength > INLINE_AUDIO_MAX_BYTES) {
      res.status(400).json({
        ok: false,
        error: `Archivo demasiado grande para subida directa (máx. ${formatAudioSize(INLINE_AUDIO_MAX_BYTES)}). Usa el botón de subir archivo.`,
      });
      return;
    }
    const audioUrl = await uploadPlaySessionAudioFile(
      session,
      playSessionId,
      buffer,
      body.audioMimeType ?? "audio/mpeg"
    );
    await saveSession(session);
    res.setHeader("X-Niku-Route", "sessions-index-upload-audio");
    res.status(200).json({
      ok: true,
      audioUrl,
      hub: buildHubView(session, participantId, user?.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir";
    res.status(400).json({ ok: false, error: message });
  }
}

export async function handleUploadCampaignAudioRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    participantId?: string;
    audioBase64?: string;
    audioMimeType?: string;
  };

  const participantId = body.participantId;
  if (!participantId) {
    res.status(400).json({ error: "participantId requerido" });
    return;
  }

  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    res.status(403).json({ error: "Solo el master puede subir audio" });
    return;
  }

  if (!body.audioBase64) {
    res.status(400).json({ error: "audioBase64 requerido" });
    return;
  }

  if (!isBlobConfigured()) {
    res.status(400).json({
      ok: false,
      error: "Configura BLOB_READ_WRITE_TOKEN en Vercel para subir archivos de audio",
    });
    return;
  }

  try {
    const buffer = Buffer.from(body.audioBase64, "base64");
    if (buffer.byteLength > INLINE_AUDIO_MAX_BYTES) {
      res.status(400).json({
        ok: false,
        error: `Archivo demasiado grande (máx. ${formatAudioSize(INLINE_AUDIO_MAX_BYTES)} en modo directo). Usa subir archivo.`,
      });
      return;
    }
    await deleteBlobIfHosted(session.campaignAudioUrl);
    const url = await uploadCampaignLevelAudio(code, buffer, body.audioMimeType ?? "audio/mpeg");
    session.campaignAudioUrl = url;
    await saveSession(session);
    res.setHeader("X-Niku-Route", "sessions-index-upload-campaign-audio");
    res.status(200).json({
      ok: true,
      audioUrl: url,
      hub: buildHubView(session, participantId, user?.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir";
    res.status(400).json({ ok: false, error: message });
  }
}

/** Registra la URL tras subida directa navegador → Vercel Blob */
export async function handleAttachAudioUrlRequest(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
  playSessionId?: string
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    participantId?: string;
    audioUrl?: string;
  };

  const participantId = body.participantId?.trim();
  const audioUrl = body.audioUrl?.trim();

  if (!participantId || !audioUrl) {
    res.status(400).json({ error: "participantId y audioUrl requeridos" });
    return;
  }

  const session = await getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    res.status(403).json({ error: "Solo el master puede adjuntar audio" });
    return;
  }

  try {
    if (playSessionId) {
      const ps = session.playSessions?.find((p) => p.id === playSessionId);
      if (!ps) {
        res.status(404).json({ error: "Sesión jugada no encontrada" });
        return;
      }
      await deleteBlobIfHosted(ps.audioUrl);
      ps.audioUrl = audioUrl;
    } else {
      await deleteBlobIfHosted(session.campaignAudioUrl);
      session.campaignAudioUrl = audioUrl;
    }

    await saveSession(session);
    res.setHeader("X-Niku-Route", "sessions-index-attach-audio");
    res.status(200).json({
      ok: true,
      audioUrl,
      hub: buildHubView(session, participantId, user?.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al guardar audio";
    res.status(400).json({ ok: false, error: message });
  }
}
