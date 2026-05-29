import type { Role } from "../types";

const KEY = "nen_session";

export interface StoredSession {
  sessionId: string;
  code: string;
  participantId: string;
  role: Role;
  name: string;
}

export function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/** Sesión guardada solo si coincide con el código de la URL */
export function loadStoredSessionForCode(code: string): StoredSession | null {
  const stored = loadStoredSession();
  if (!stored) return null;
  if (stored.code.toUpperCase() !== code.toUpperCase().trim()) return null;
  return stored;
}

export function saveStoredSession(data: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearStoredSession(): void {
  localStorage.removeItem(KEY);
}
