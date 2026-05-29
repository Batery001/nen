import { loadAuthToken } from "./hooks/useAuthStorage";
import type {
  CharacterPatch,
  HubMasterPatch,
  HubView,
  JoinResponse,
  Role,
  SessionListItem,
  SessionSnapshot,
  User,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = loadAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

export async function requestLoginCode(
  email: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  const res = await fetch(apiUrl("/api/auth/request-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, displayName }),
  });
  return readJson(res);
}

export async function verifyLoginCode(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string; token?: string; user?: User }> {
  const res = await fetch(apiUrl("/api/auth/verify-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return readJson(res);
}

export async function fetchMe(token?: string): Promise<User> {
  const t = token ?? loadAuthToken();
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: authHeaders(t ? { Authorization: `Bearer ${t}` } : {}),
  });
  if (!res.ok) throw new Error(await parseError(res, "Sesión inválida"));
  const data = await readJson<{ user: User }>(res);
  return data.user;
}

export async function logout(token?: string): Promise<void> {
  const t = token ?? loadAuthToken();
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers: authHeaders(t ? { Authorization: `Bearer ${t}` } : {}),
  });
}

export async function listSessions(): Promise<SessionListItem[]> {
  const res = await fetch(apiUrl("/api/sessions"));
  if (!res.ok) throw new Error(await parseError(res, "No se pudieron cargar las mesas"));
  const data = await readJson<{ sessions: SessionListItem[] }>(res);
  return data.sessions ?? [];
}

export async function listMyCampaigns(): Promise<SessionListItem[]> {
  const res = await fetch(apiUrl("/api/sessions?mine=1"), {
    headers: authHeaders(),
  });
  if (res.status === 401) throw new Error("Inicia sesión para ver tus campañas");
  if (!res.ok) throw new Error(await parseError(res, "No se pudieron cargar tus campañas"));
  const data = await readJson<{ sessions: SessionListItem[] }>(res);
  return data.sessions ?? [];
}

export async function rejoinCampaign(code: string): Promise<JoinResponse> {
  const res = await fetch(
    apiUrl(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/rejoin`),
    { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }) }
  );
  const data = await readJson<JoinResponse>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo reingresar");
  return data;
}

export async function createSessionAsMaster(name: string): Promise<JoinResponse> {
  const res = await fetch(apiUrl("/api/sessions"), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name: name.trim(), role: "master" }),
  });
  const data = await readJson<JoinResponse>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo crear la partida");
  }
  return data;
}

export async function getSessionByCode(code: string): Promise<SessionSnapshot> {
  const normalized = code.toUpperCase().trim();
  const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(normalized)}`));
  if (res.status === 404) throw new Error("Partida no encontrada");
  if (!res.ok) throw new Error(await parseError(res, "Error al cargar la partida"));
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
      headers: authHeaders({ "Content-Type": "application/json" }),
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
  const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(code)}/leave`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "No se pudo desconectar"));
  }
}

function hubUrl(code: string, participantId: string, path = "hub"): string {
  const base = apiUrl(
    `/api/sessions/${encodeURIComponent(code.toUpperCase())}/${path}`
  );
  return `${base}?participantId=${encodeURIComponent(participantId)}`;
}

export async function fetchHub(code: string, participantId: string): Promise<HubView> {
  const res = await fetch(hubUrl(code, participantId), { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo cargar el hub"));
  return readJson(res);
}

export async function updateHub(
  code: string,
  participantId: string,
  patch: HubMasterPatch
): Promise<HubView> {
  const res = await fetch(hubUrl(code, participantId), {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo guardar"));
  return readJson(res);
}

export async function getJoinRequestStatus(
  code: string,
  requestId: string
): Promise<JoinResponse> {
  const res = await fetch(
    apiUrl(
      `/api/sessions/${encodeURIComponent(code.toUpperCase())}/join-requests/${encodeURIComponent(requestId)}`
    )
  );
  const data = await readJson<JoinResponse>(res);
  if (!res.ok && !data.error) {
    throw new Error("No se pudo consultar la solicitud");
  }
  return data;
}

export async function resolveJoinRequest(
  code: string,
  participantId: string,
  requestId: string,
  action: "approve" | "reject"
): Promise<JoinResponse> {
  const res = await fetch(
    apiUrl(
      `/api/sessions/${encodeURIComponent(code.toUpperCase())}/join-requests/${encodeURIComponent(requestId)}`
    ),
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ participantId, action }),
    }
  );
  const data = await readJson<JoinResponse>(res);
  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo procesar la solicitud");
  }
  return data;
}

export async function updateCharacter(
  code: string,
  participantId: string,
  patch: CharacterPatch,
  targetParticipantId?: string
): Promise<HubView> {
  const res = await fetch(hubUrl(code, participantId, "hub/character"), {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ targetParticipantId, patch }),
  });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo guardar personaje"));
  return readJson(res);
}
