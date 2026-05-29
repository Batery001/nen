import {
  downloadAudio,
  extractCampaignNotesFromTranscript,
  isOpenAiConfigured,
  transcribeAudioBuffer,
} from "./ai/extractSession.js";
import { applySessionProposal, findPlaySession } from "./ai/applyProposal.js";
import { ensureHubFields } from "./migrate.js";
import type { GameSession, SessionAiProposal } from "./types.js";

export async function processPlaySessionAudio(
  campaign: GameSession,
  playSessionId: string,
  options: {
    audioUrl?: string;
    audioBase64?: string;
    audioMimeType?: string;
    transcript?: string;
  }
): Promise<{ transcript: string; proposal: SessionAiProposal }> {
  if (!isOpenAiConfigured()) {
    throw new Error(
      "Configura OPENAI_API_KEY en Vercel (y localmente en .env) para transcribir y analizar sesiones"
    );
  }

  const s = ensureHubFields(campaign);
  const ps = findPlaySession(s, playSessionId);
  if (!ps) throw new Error("Sesión jugada no encontrada");

  ps.transcriptStatus = "processing";
  ps.transcriptError = undefined;

  let transcript = options.transcript?.trim() ?? "";

  try {
    if (!transcript) {
      if (options.audioBase64) {
        const buffer = Buffer.from(options.audioBase64, "base64");
        if (buffer.byteLength > 4 * 1024 * 1024) {
          throw new Error(
            "Archivo demasiado grande para subir directo (máx. 4 MB). Usa URL de audio o pega la transcripción."
          );
        }
        transcript = await transcribeAudioBuffer(
          buffer,
          "upload.mp3",
          options.audioMimeType ?? "audio/mpeg"
        );
      } else if (options.audioUrl?.trim()) {
        const { buffer, mimeType, filename } = await downloadAudio(options.audioUrl.trim());
        transcript = await transcribeAudioBuffer(buffer, filename, mimeType);
        ps.audioUrl = options.audioUrl.trim();
      } else if (ps.audioUrl?.trim()) {
        const { buffer, mimeType, filename } = await downloadAudio(ps.audioUrl.trim());
        transcript = await transcribeAudioBuffer(buffer, filename, mimeType);
      } else {
        throw new Error("Sube un audio, pega una URL o pega la transcripción de la sesión");
      }
    }

    ps.transcript = transcript;

    const playerNames = s.participants
      .filter((p) => p.role === "player")
      .map((p) => {
        const ch = s.characters.find((c) => c.participantId === p.id);
        return ch?.characterName ? `${p.name} (${ch.characterName})` : p.name;
      });

    const proposal = await extractCampaignNotesFromTranscript(transcript, {
      campaignTitle: s.campaignTitle,
      sessionTitle: ps.title,
      playerNames,
    });

    ps.aiProposal = proposal;
    ps.transcriptStatus = "done";

    return { transcript, proposal };
  } catch (err) {
    ps.transcriptStatus = "error";
    ps.transcriptError = err instanceof Error ? err.message : "Error al procesar";
    throw err;
  }
}

export function updatePlaySessionProposal(
  campaign: GameSession,
  playSessionId: string,
  proposal: SessionAiProposal
): SessionAiProposal {
  const ps = findPlaySession(campaign, playSessionId);
  if (!ps) throw new Error("Sesión jugada no encontrada");
  ps.aiProposal = proposal;
  return proposal;
}

export function applyPlaySessionProposal(
  campaign: GameSession,
  playSessionId: string,
  proposalOverride?: SessionAiProposal
): SessionAiProposal {
  const ps = findPlaySession(campaign, playSessionId);
  const proposal = proposalOverride ?? ps?.aiProposal;
  if (!proposal) throw new Error("No hay propuesta para aplicar");
  applySessionProposal(campaign, playSessionId, proposal);
  return proposal;
}

export async function uploadPlaySessionAudioFile(
  campaign: GameSession,
  playSessionId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const ps = findPlaySession(campaign, playSessionId);
  if (!ps) throw new Error("Sesión jugada no encontrada");

  const { uploadCampaignAudio, isBlobConfigured } = await import("./blobStorage.js");
  if (!isBlobConfigured()) {
    throw new Error(
      "Configura BLOB_READ_WRITE_TOKEN en Vercel (Storage → Blob) para subir audios de sesión"
    );
  }

  const url = await uploadCampaignAudio(campaign.code, playSessionId, buffer, contentType);
  ps.audioUrl = url;
  return url;
}
