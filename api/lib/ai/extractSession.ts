import type { SessionAiProposal, WikiEntryType } from "../types.js";

const WIKI_TYPES = new Set<WikiEntryType>(["location", "item", "npc", "note"]);

interface RawExtraction {
  summary?: string;
  locations?: Array<{ title?: string; body?: string }>;
  items?: Array<{ title?: string; body?: string }>;
  npcs?: Array<{ title?: string; body?: string }>;
  characters?: Array<{
    name?: string;
    bioAddition?: string;
    privateNotes?: string;
  }>;
  notes?: Array<{ title?: string; body?: string }>;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada en el servidor");

  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || "audio/mpeg" });
  form.append("file", blob, filename);
  form.append("model", "whisper-1");
  form.append("language", "es");
  form.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Transcripción falló: ${errText.slice(0, 200)}`);
  }

  return (await res.text()).trim();
}

export async function downloadAudio(url: string, maxBytes = 24 * 1024 * 1024): Promise<{
  buffer: Buffer;
  mimeType: string;
  filename: string;
}> {
  const head = await fetch(url, { method: "HEAD", redirect: "follow" });
  const len = Number(head.headers.get("content-length") || 0);
  if (len > maxBytes) {
    throw new Error("El audio es demasiado grande (máx. ~24 MB). Usa un enlace más corto o pega la transcripción.");
  }

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("No se pudo descargar el audio desde la URL");

  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength > maxBytes) {
    throw new Error("El audio supera el límite de tamaño (~24 MB)");
  }

  const mimeType = res.headers.get("content-type") || "audio/mpeg";
  const filename = url.split("/").pop()?.split("?")[0] || "session-audio.mp3";

  return { buffer: Buffer.from(arrayBuf), mimeType, filename };
}

export async function extractCampaignNotesFromTranscript(
  transcript: string,
  context: { campaignTitle: string; sessionTitle: string; playerNames: string[] }
): Promise<SessionAiProposal> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada en el servidor");

  const system = `Eres un asistente para master de rol en mesa (RPG). A partir de la transcripción de una sesión jugada, extrae información estructurada en español.
Responde SOLO con JSON válido (sin markdown) con esta forma:
{
  "summary": "resumen narrativo de la sesión (2-4 párrafos, tercera persona)",
  "locations": [{ "title": "", "body": "" }],
  "items": [{ "title": "", "body": "" }],
  "npcs": [{ "title": "", "body": "" }],
  "characters": [{ "name": "nombre PJ o jugador", "bioAddition": "qué pasó con ese personaje", "privateNotes": "opcional master" }],
  "notes": [{ "title": "", "body": "" }]
}
Incluye solo entradas con información real de la partida. Si no hay datos para una categoría, usa array vacío.`;

  const user = `Campaña: ${context.campaignTitle}
Sesión: ${context.sessionTitle}
Jugadores en mesa: ${context.playerNames.join(", ") || "desconocidos"}

Transcripción:
${transcript.slice(0, 120000)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Análisis IA falló: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("La IA no devolvió contenido");

  let raw: RawExtraction;
  try {
    raw = JSON.parse(content) as RawExtraction;
  } catch {
    throw new Error("Respuesta IA inválida");
  }

  const wikiEntries: SessionAiProposal["wikiEntries"] = [];

  function pushWiki(type: WikiEntryType, list?: Array<{ title?: string; body?: string }>) {
    if (!list) return;
    for (const item of list) {
      const title = item.title?.trim();
      if (!title) continue;
      wikiEntries.push({
        type,
        title,
        body: item.body?.trim() ?? "",
        masterOnly: false,
      });
    }
  }

  pushWiki("location", raw.locations);
  pushWiki("item", raw.items);
  pushWiki("npc", raw.npcs);
  pushWiki("note", raw.notes);

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    summary: raw.summary?.trim() ?? "",
    wikiEntries,
    characterNotes: (raw.characters ?? [])
      .filter((c) => c.name?.trim())
      .map((c) => ({
        playerOrCharacterName: c.name!.trim(),
        bioAddition: c.bioAddition?.trim() ?? "",
        privateNotes: c.privateNotes?.trim(),
      })),
  };
}
