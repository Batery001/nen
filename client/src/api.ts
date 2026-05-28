import type { JoinResponse, Role, SessionSnapshot } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Respuesta vacía del servidor (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.trim().slice(0, 60);
    if (start.startsWith("<!") || start.startsWith("<html")) {
      throw new Error(
        "La API devolvió HTML en lugar de JSON. En Vercel: Root Directory = raíz del repo, redeploy, y borra VITE_API_URL si no usas backend externo."
      );
    }
    throw new Error(`Respuesta inválida (${res.status}): ${start}…`);
  }
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await readJson<{ error?: string }>(res);
    return data.error ?? fallback;
  } catch (e) {
    return e instanceof Error ? e.message : fallback;
  }
}

export async function createSession(): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl("/api/sessions"), { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo crear la partida"));
  return readJson(res);
}

/** Crea la partida y entra como master en una sola petición */
export async function createSessionAsMaster(name: string): Promise<JoinResponse> {
  const res = await fetch(apiUrl("/api/sessions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), role: "master" }),
  });
  const data = await readJson<JoinResponse>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo crear la partida");
  }
  return data;
}

export async function getSessionByCode(code: string): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(code)}`));
  if (!res.ok) throw new Error(await parseError(res, "Partida no encontrada"));
  return readJson(res);
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
  const data = await readJson<JoinResponse>(res);
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
