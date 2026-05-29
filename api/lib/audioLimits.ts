/** Límite Whisper (OpenAI) para transcribir un solo archivo */
export const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

/** Subida directa al navegador → Blob (sesiones largas, hasta ~100 MB) */
export const BLOB_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Por debajo de esto se puede enviar en JSON (solo dev / sin Blob) */
export const INLINE_AUDIO_MAX_BYTES = 3 * 1024 * 1024;

export function formatAudioSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function shouldDeleteAudioAfterTranscribe(): boolean {
  const v = process.env.AUDIO_KEEP_AFTER_TRANSCRIBE?.trim().toLowerCase();
  return v !== "1" && v !== "true" && v !== "yes";
}
