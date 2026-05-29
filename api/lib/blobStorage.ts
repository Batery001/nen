export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function uploadCampaignAudio(
  campaignCode: string,
  playSessionId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Configura BLOB_READ_WRITE_TOKEN en Vercel (Storage → Blob) para subir audios grandes"
    );
  }

  const { put } = await import("@vercel/blob");
  const ext = contentType.includes("mpeg")
    ? "mp3"
    : contentType.includes("wav")
      ? "wav"
      : contentType.includes("ogg")
        ? "ogg"
        : "audio";
  const pathname = `campaigns/${campaignCode.toUpperCase()}/${playSessionId}/${Date.now()}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: contentType || "audio/mpeg",
    token,
  });

  return blob.url;
}
