import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { BLOB_UPLOAD_MAX_BYTES } from "../lib/audioLimits.js";
import { requireMaster } from "../lib/hub.js";
import { findPlaySession } from "../lib/ai/applyProposal.js";
import { isBlobConfigured } from "../lib/blobStorage.js";
import { getUserFromRequest } from "../lib/requestAuth.js";
import { getSessionByCode } from "../lib/store.js";

type UploadKind = "play-session" | "campaign";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!isBlobConfigured()) {
    return res.status(400).json({
      ok: false,
      error: "Configura BLOB_READ_WRITE_TOKEN en Vercel para subir audios largos",
    });
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    code?: string;
    participantId?: string;
    kind?: UploadKind;
    playSessionId?: string;
    contentLength?: number;
  };

  const code = body.code?.toUpperCase().trim();
  const participantId = body.participantId?.trim();
  const kind = body.kind;
  const contentLength = Number(body.contentLength ?? 0);

  if (!code || !participantId || !kind) {
    return res.status(400).json({ error: "code, participantId y kind requeridos" });
  }

  if (contentLength > BLOB_UPLOAD_MAX_BYTES) {
    return res.status(400).json({
      error: `El archivo supera ${BLOB_UPLOAD_MAX_BYTES / (1024 * 1024)} MB. Comprime a MP3 o divide la sesión.`,
    });
  }

  const session = await getSessionByCode(code);
  if (!session) {
    return res.status(404).json({ error: "Partida no encontrada" });
  }

  const user = await getUserFromRequest(req);
  if (!requireMaster(session, participantId, user?.id)) {
    return res.status(403).json({ error: "Solo el master puede subir audio" });
  }

  if (kind === "play-session") {
    const playSessionId = body.playSessionId?.trim();
    if (!playSessionId) {
      return res.status(400).json({ error: "playSessionId requerido" });
    }
    if (!findPlaySession(session, playSessionId)) {
      return res.status(404).json({ error: "Sesión jugada no encontrada" });
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  const stamp = Date.now();
  const pathname =
    kind === "campaign"
      ? `campaigns/${code}/campaign-audio/${stamp}`
      : `campaigns/${code}/${body.playSessionId}/${stamp}`;

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname,
      maximumSizeInBytes: BLOB_UPLOAD_MAX_BYTES,
      allowedContentTypes: [
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/wav",
        "audio/wave",
        "audio/ogg",
        "audio/webm",
        "audio/x-wav",
        "application/octet-stream",
      ],
    });

    return res.status(200).json({
      ok: true,
      clientToken,
      pathname,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo preparar la subida";
    return res.status(400).json({ ok: false, error: message });
  }
}
