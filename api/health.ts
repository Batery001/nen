import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isMongoConfigured, pingDb } from "./lib/db/client.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const mongo = isMongoConfigured();
  let dbOk = false;
  let dbError: string | undefined;

  if (mongo) {
    try {
      dbOk = await pingDb();
    } catch (err) {
      dbOk = false;
      dbError = err instanceof Error ? err.message : "Error de conexión";
    }
  }

  return res.status(200).json({
    ok: true,
    api: "niku-2",
    mongo: mongo ? (dbOk ? "connected" : "error") : "not_configured",
    ...(dbError && { dbError }),
  });
}
