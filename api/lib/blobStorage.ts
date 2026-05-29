export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isHostedBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("blob.vercel-storage.com") || host.includes("public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Elimina un archivo en Vercel Blob si la URL es nuestra (libera espacio tras transcribir). */
export async function deleteBlobIfHosted(url: string | undefined): Promise<void> {
  if (!url?.trim() || !isHostedBlobUrl(url)) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url.trim(), { token });
  } catch (err) {
    console.warn("deleteBlobIfHosted", url, err);
  }
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

export async function uploadCampaignLevelAudio(
  campaignCode: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Configura BLOB_READ_WRITE_TOKEN en Vercel (Storage → Blob) para subir audios"
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
  const pathname = `campaigns/${campaignCode.toUpperCase()}/campaign-audio/${Date.now()}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: contentType || "audio/mpeg",
    token,
  });

  return blob.url;
}

