import { customAlphabet } from "nanoid";
import type { User } from "./types.js";
import * as userDb from "./db/users.js";
import { isMongoConfigured } from "./db/client.js";
import { checkRateLimit } from "./rateLimit.js";

const codeGen = customAlphabet("0123456789", 6);
const tokenGen = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  48
);

const CODE_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const memoryUsers = new Map<string, User>();
const memoryCodes = new Map<string, { code: string; expiresAt: number; displayName?: string }>();
const memorySessions = new Map<string, { userId: string; expiresAt: number }>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function authAvailable(): boolean {
  return isMongoConfigured();
}

export async function requestLoginCode(
  email: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Email inválido" };
  }

  const limit = checkRateLimit(`auth:${normalized}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Demasiados intentos. Espera ${limit.retryAfterSec ?? 60} segundos.`,
    };
  }

  const code = codeGen();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  if (isMongoConfigured()) {
    await userDb.saveAuthCode({ email: normalized, code, expiresAt, displayName });
  } else {
    memoryCodes.set(normalized, {
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      displayName,
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Niku <onboarding@resend.dev>",
          to: normalized,
          subject: "Tu código de acceso a Niku",
          text: `Tu código es ${code}. Válido 15 minutos.`,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("Resend error", await res.text());
    } catch (err) {
      console.error("Resend error", err);
    }
  } else {
    console.info(`[niku auth] código para ${normalized}: ${code}`);
  }

  const devCode = !emailSent ? code : undefined;

  return { ok: true, devCode };
}

export async function verifyLoginCode(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string; token?: string; user?: User }> {
  const normalized = normalizeEmail(email);
  const trimmedCode = code.trim();

  let valid = false;
  let pendingDisplayName: string | undefined;

  if (isMongoConfigured()) {
    const record = await userDb.getAuthCode(normalized);
    if (record && record.code === trimmedCode && new Date(record.expiresAt) > new Date()) {
      valid = true;
      pendingDisplayName = record.displayName;
      await userDb.deleteAuthCode(normalized);
    }
  } else {
    const record = memoryCodes.get(normalized);
    if (record && record.code === trimmedCode && record.expiresAt > Date.now()) {
      valid = true;
      pendingDisplayName = record.displayName;
      memoryCodes.delete(normalized);
    }
  }

  if (!valid) {
    return { ok: false, error: "Código inválido o expirado" };
  }

  let user: User | undefined;
  if (isMongoConfigured()) {
    user = await userDb.findUserByEmail(normalized);
  } else {
    user = [...memoryUsers.values()].find((u) => u.email === normalized);
  }

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email: normalized,
      displayName: pendingDisplayName ?? normalized.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    if (isMongoConfigured()) {
      await userDb.upsertUser(user);
    } else {
      memoryUsers.set(user.id, user);
    }
  } else if (pendingDisplayName && pendingDisplayName.length >= 2) {
    user.displayName = pendingDisplayName;
    if (isMongoConfigured()) {
      await userDb.upsertUser(user);
    }
  }

  const token = tokenGen();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  if (isMongoConfigured()) {
    await userDb.saveAuthSession({ token, userId: user.id, expiresAt });
  } else {
    memorySessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
  }

  return { ok: true, token, user };
}

export async function getUserByToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  let userId: string | undefined;

  if (isMongoConfigured()) {
    const session = await userDb.findAuthSessionByToken(token);
    if (!session || new Date(session.expiresAt) <= new Date()) {
      if (session) await userDb.deleteAuthSession(token);
      return null;
    }
    userId = session.userId;
  } else {
    const session = memorySessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      memorySessions.delete(token);
      return null;
    }
    userId = session.userId;
  }

  if (!userId) return null;

  if (isMongoConfigured()) {
    return (await userDb.findUserById(userId)) ?? null;
  }
  return memoryUsers.get(userId) ?? null;
}

export async function revokeToken(token: string): Promise<void> {
  if (isMongoConfigured()) {
    await userDb.deleteAuthSession(token);
  } else {
    memorySessions.delete(token);
  }
}

export function bearerTokenFromHeader(
  authHeader: string | undefined
): string | undefined {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  return authHeader.slice(7).trim() || undefined;
}
