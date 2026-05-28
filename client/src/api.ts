import type { JoinResponse, Role, SessionSnapshot } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function createSession(): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl("/api/sessions"), { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo crear la partida"));
  return res.json();
}

/** Crea la partida y entra como master en una sola petición */
export async function createSessionAsMaster(name: string): Promise<JoinResponse> {
  const res = await fetch(apiUrl("/api/sessions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), role: "master" }),
  });
  const data = (await res.json()) as JoinResponse;
  if (!res.ok) {
    throw new Error(data.error ?? (await parseError(res, "No se pudo crear la partida")));
  }
  return data;
}

export async function getSessionByCode(code: string): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(code)}`));
  if (!res.ok) throw new Error(await parseError(res, "Partida no encontrada"));
  return res.json();
}

export async function joinSession(payload: {
  code: string;
  name: string;
  role: Role;
  sessionId?: string;
}): Promise<JoinResponse> {
  const res = await fetch(
    apiUrl(`/api/sessions/${encodeURIComponent(payload.code)}/join`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        role: payload.role,
        sessionId: payload.sessionId,
      }),
    }
  );
  const data = (await res.json()) as JoinResponse;
  if (!res.ok && !data.error) {
    return { ok: false, error: "No se pudo unir a la partida" };
  }
  return data;
}

export async function leaveSession(code: string, participantId: string): Promise<void> {
  await fetch(apiUrl(`/api/sessions/${encodeURIComponent(code)}/leave`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId }),
  });
}
