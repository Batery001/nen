import type { GameSession, WikiEntry } from "../types.js";
import { ensureHubFields } from "../migrate.js";
import { isOpenAiConfigured } from "./extractSession.js";

export interface NpcSuggestion {
  title: string;
  body: string;
  hooks: string[];
}

export async function suggestNpcFromWiki(
  session: GameSession,
  hint?: string
): Promise<NpcSuggestion> {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const s = ensureHubFields(session);
  const wikiContext = s.wiki
    .filter((w) => !w.masterOnly || true)
    .slice(0, 40)
    .map((w: WikiEntry) => `[${w.type}] ${w.title}: ${w.body.slice(0, 300)}`)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Genera un NPC coherente con la campaña en español. JSON: {"title":"","body":"","hooks":["",""]}',
        },
        {
          role: "user",
          content: `Campaña: ${s.campaignTitle}\nWiki:\n${wikiContext || "vacía"}\nPetición: ${hint || "NPC interesante para la trama actual"}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`IA NPC: ${(await res.text()).slice(0, 120)}`);

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Sin respuesta IA");

  const raw = JSON.parse(content) as NpcSuggestion;
  return {
    title: raw.title?.trim() || "NPC sin nombre",
    body: raw.body?.trim() || "",
    hooks: Array.isArray(raw.hooks) ? raw.hooks.filter(Boolean) : [],
  };
}
