import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCharacterPatch, buildHubView } from "../../../lib/hub.js";
import { ensureHubFields } from "../../../lib/migrate.js";
import { getUserFromRequest } from "../../../lib/requestAuth.js";
import type { CharacterPatch } from "../../../lib/types.js";
import { getSessionByCode, saveSession } from "../../../lib/store.js";

/** PUT /api/sessions/:code/hub/character */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const code = (req.query.code as string)?.toUpperCase().trim();
  const participantId =
    typeof req.query.participantId === "string" ? req.query.participantId : undefined;

  if (!code || !participantId) {
    return res.status(400).json({ error: "code y participantId requeridos" });
  }

  try {
    const session = await getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    const user = await getUserFromRequest(req);
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
      targetParticipantId?: string;
      patch?: CharacterPatch;
    };

    const result = applyCharacterPatch(
      ensureHubFields(session),
      participantId,
      body.targetParticipantId ?? participantId,
      body.patch ?? {}
    );
    if (!result.ok) {
      return res.status(403).json({ error: result.error });
    }

    await saveSession(session);
    return res.status(200).json(buildHubView(session, participantId, user?.id));
  } catch (err) {
    console.error(`PUT /api/sessions/${code}/hub/character`, err);
    return res.status(500).json({ error: "Error al guardar personaje" });
  }
}
