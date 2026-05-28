import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionData, toSnapshot } from "../lib/sessions.js";
import { getSessionByCode, saveSession } from "../lib/store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  let session = createSessionData();
  while (await getSessionByCode(session.code)) {
    session = createSessionData();
  }
  await saveSession(session);
  return res.status(201).json(toSnapshot(session));
}
