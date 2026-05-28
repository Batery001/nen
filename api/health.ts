import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isMongoConfigured, pingDb } from "../lib/db/client.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const mongo = isMongoConfigured();
  let dbOk = false;
  if (mongo) {
    try {
      dbOk = await pingDb();
    } catch {
      dbOk = false;
    }
  }
  return res.status(200).json({
    ok: true,
    mongo: mongo ? (dbOk ? "connected" : "error") : "not_configured",
  });
}
