import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCharacterPatch, buildHubView } from "../../../lib/hub.js";
import { ensureHubFields } from "../../../lib/migrate.js";
import type { CharacterPatch } from "../../../lib/types.js";
import { getSessionByCode, saveSession } from "../../../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const participantId = req.query.participantId as string;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!code || !participantId) {
    return res.status(400).json({ error: "code y participantId requeridos" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) return res.status(404).json({ error: "Partida no encontrada" });

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { targetParticipantId, patch } = body as {
      targetParticipantId?: string;
      patch?: CharacterPatch;
    };

    const result = applyCharacterPatch(
      ensureHubFields(session),
      participantId,
      targetParticipantId ?? participantId,
      patch ?? {}
    );
    if (!result.ok) return res.status(403).json({ error: result.error });

    await saveSession(session);
    return res.status(200).json(buildHubView(session, participantId));
  } catch (err) {
    console.error("character handler", err);
    const message = err instanceof Error ? err.message : "Error";
    return res.status(500).json({ error: message });
  }
}
