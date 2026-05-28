import type { VercelRequest } from "@vercel/node";
import { bearerTokenFromHeader, getUserByToken } from "./auth.js";
import type { User } from "./types.js";

export async function getUserFromAuthHeader(
  authHeader?: string | string[]
): Promise<User | null> {
  const h = typeof authHeader === "string" ? authHeader : authHeader?.[0];
  return getUserByToken(bearerTokenFromHeader(h));
}

export async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  return getUserFromAuthHeader(req.headers.authorization);
}
