import { put } from "@vercel/blob/client";
import { loadAuthToken } from "../hooks/useAuthStorage";
import type { HubView } from "../types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = loadAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) throw new Error(`Respuesta vacía del servidor (${res.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta inválida (${res.status})`);
  }
}

export const BLOB_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
export const INLINE_AUDIO_MAX_BYTES = 3 * 1024 * 1024;
export const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

export function formatAudioSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fileToBase64(file: File): Promise<{ audioBase64: string; audioMimeType: string }> {
  return file.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return {
      audioBase64: btoa(binary),
      audioMimeType: file.type || "audio/mpeg",
    };
  });
}

async function fetchBlobUploadToken(
  code: string,
  participantId: string,
  kind: "play-session" | "campaign",
  file: File,
  playSessionId?: string
): Promise<{ clientToken: string; pathname: string }> {
  const res = await fetch(apiUrl("/api/blob/upload-token"), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      code: code.toUpperCase(),
      participantId,
      kind,
      playSessionId,
      contentLength: file.size,
    }),
  });
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    clientToken?: string;
    pathname?: string;
  }>(res);
  if (!res.ok || !data.clientToken || !data.pathname) {
    throw new Error(data.error ?? "No se pudo preparar la subida a la nube");
  }
  return { clientToken: data.clientToken, pathname: data.pathname };
}

async function attachAudioUrl(
  code: string,
  participantId: string,
  audioUrl: string,
  playSessionId?: string
): Promise<{ audioUrl: string; hub: HubView }> {
  const params = new URLSearchParams({
    action: "attach-audio",
    code: code.toUpperCase(),
    participantId,
  });
  if (playSessionId) params.set("playSessionId", playSessionId);

  const res = await fetch(apiUrl(`/api/sessions?${params}`), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ participantId, audioUrl }),
  });
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    audioUrl?: string;
    hub?: HubView;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el audio");
  if (!data.audioUrl || !data.hub) throw new Error("Respuesta incompleta");
  return { audioUrl: data.audioUrl, hub: data.hub };
}

async function uploadViaBlob(
  code: string,
  participantId: string,
  file: File,
  kind: "play-session" | "campaign",
  playSessionId?: string
): Promise<{ audioUrl: string; hub: HubView }> {
  const ext =
    file.name.match(/\.(mp3|m4a|wav|ogg|webm)$/i)?.[1]?.toLowerCase() ??
    (file.type.includes("mpeg") ? "mp3" : file.type.includes("wav") ? "wav" : "audio");

  const { clientToken, pathname } = await fetchBlobUploadToken(
    code,
    participantId,
    kind,
    file,
    playSessionId
  );

  const blob = await put(`${pathname}.${ext}`, file, {
    access: "public",
    token: clientToken,
    contentType: file.type || "audio/mpeg",
  });

  return attachAudioUrl(code, participantId, blob.url, playSessionId);
}

async function uploadViaBase64Campaign(
  code: string,
  participantId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  const { audioBase64, audioMimeType } = await fileToBase64(file);
  const params = new URLSearchParams({
    action: "upload-campaign-audio",
    code: code.toUpperCase(),
    participantId,
  });
  const res = await fetch(apiUrl(`/api/sessions?${params}`), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ participantId, audioBase64, audioMimeType }),
  });
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    audioUrl?: string;
    hub?: HubView;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir el audio");
  if (!data.audioUrl || !data.hub) throw new Error("Respuesta incompleta");
  return { audioUrl: data.audioUrl, hub: data.hub };
}

async function uploadViaBase64PlaySession(
  code: string,
  participantId: string,
  playSessionId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  const { audioBase64, audioMimeType } = await fileToBase64(file);
  const params = new URLSearchParams({
    action: "upload-audio",
    code: code.toUpperCase(),
    playSessionId,
  });
  const res = await fetch(apiUrl(`/api/sessions?${params}`), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ participantId, audioBase64, audioMimeType }),
  });
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    audioUrl?: string;
    hub?: HubView;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir el audio");
  if (!data.audioUrl || !data.hub) throw new Error("Respuesta incompleta");
  return { audioUrl: data.audioUrl, hub: data.hub };
}

function assertFileSize(file: File): void {
  if (file.size > BLOB_UPLOAD_MAX_BYTES) {
    throw new Error(
      `El archivo pesa ${formatAudioSize(file.size)} (máx. ${formatAudioSize(BLOB_UPLOAD_MAX_BYTES)}). ` +
        "Exporta la sesión como MP3 (64–96 kbps) o pega la transcripción."
    );
  }
}

/** Subida optimizada: archivos grandes van directo a Blob sin pasar por la API en base64. */
export async function uploadCampaignAudioSmart(
  code: string,
  participantId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  assertFileSize(file);
  if (file.size > INLINE_AUDIO_MAX_BYTES) {
    return uploadViaBlob(code, participantId, file, "campaign");
  }
  try {
    return await uploadViaBase64Campaign(code, participantId, file);
  } catch {
    return uploadViaBlob(code, participantId, file, "campaign");
  }
}

export async function uploadPlaySessionAudioSmart(
  code: string,
  participantId: string,
  playSessionId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  assertFileSize(file);
  if (file.size > INLINE_AUDIO_MAX_BYTES) {
    return uploadViaBlob(code, participantId, file, "play-session", playSessionId);
  }
  try {
    return await uploadViaBase64PlaySession(code, participantId, playSessionId, file);
  } catch {
    return uploadViaBlob(code, participantId, file, "play-session", playSessionId);
  }
}
