import { loadAuthToken } from "./hooks/useAuthStorage";
import type {
  CharacterPatch,
  HubMasterPatch,
  HubView,
  JoinResponse,
  Role,
  NpcSuggestion,
  SessionAiProposal,
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
  const params = new URLSearchParams({
    action: "rejoin",
    code: code.toUpperCase(),
  });
  const res = await fetch(apiUrl(`/api/sessions?${params}`), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: "{}",
  });
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

function hubQueryUrl(code: string, participantId: string): string {
  const params = new URLSearchParams({
    action: "hub",
    code: code.toUpperCase(),
    participantId,
  });
  return apiUrl(`/api/sessions?${params}`);
}

function assertHubView(data: unknown): HubView {
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta del hub inválida");
  }
  const d = data as HubView & { rolesAvailable?: unknown };
  if ("rolesAvailable" in d && !d.role) {
    throw new Error(
      "La API devolvió un snapshot en lugar del hub. En Vercel: redeploy del último commit (rutas /hub dedicadas)."
    );
  }
  if (!d.role || !d.participantId) {
    throw new Error(
      "Hub incompleto (falta rol). Desconecta y entra otra vez desde Mis campañas."
    );
  }
  return d;
}

export async function fetchHub(code: string, participantId: string): Promise<HubView> {
  const res = await fetch(hubQueryUrl(code, participantId), {
    headers: authHeaders({ Accept: "application/json" }),
  });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo cargar el hub"));
  return assertHubView(await readJson(res));
}

export async function updateHub(
  code: string,
  participantId: string,
  patch: HubMasterPatch
): Promise<HubView> {
  const res = await fetch(hubQueryUrl(code, participantId), {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo guardar"));
  return assertHubView(await readJson(res));
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

export async function processPlaySessionAudio(
  code: string,
  participantId: string,
  playSessionId: string,
  options: {
    audioUrl?: string;
    audioBase64?: string;
    audioMimeType?: string;
    transcript?: string;
  }
): Promise<{ transcript: string; proposal: SessionAiProposal; hub: HubView }> {
  const res = await fetch(
    apiUrl(
      `/api/sessions/${encodeURIComponent(code.toUpperCase())}/play-sessions/${encodeURIComponent(playSessionId)}/process-audio`
    ),
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ participantId, ...options }),
    }
  );
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    transcript?: string;
    proposal?: SessionAiProposal;
    hub?: HubView;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo procesar el audio");
  if (!data.transcript || !data.proposal || !data.hub) {
    throw new Error("Respuesta incompleta del servidor");
  }
  return { transcript: data.transcript, proposal: data.proposal, hub: data.hub };
}

export async function uploadCampaignAudioFile(
  code: string,
  participantId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  const { uploadCampaignAudioSmart } = await import("./lib/audioUpload.js");
  return uploadCampaignAudioSmart(code, participantId, file);
}

export async function uploadPlaySessionAudio(
  code: string,
  participantId: string,
  playSessionId: string,
  file: File
): Promise<{ audioUrl: string; hub: HubView }> {
  const { uploadPlaySessionAudioSmart } = await import("./lib/audioUpload.js");
  return uploadPlaySessionAudioSmart(code, participantId, playSessionId, file);
}

export async function updatePlaySessionProposal(
  code: string,
  participantId: string,
  playSessionId: string,
  proposal: SessionAiProposal
): Promise<HubView> {
  const res = await fetch(
    apiUrl(
      `/api/sessions/${encodeURIComponent(code.toUpperCase())}/play-sessions/${encodeURIComponent(playSessionId)}/update-proposal`
    ),
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ participantId, proposal }),
    }
  );
  const data = await readJson<{ hub?: HubView; error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la propuesta");
  if (!data.hub) throw new Error("Respuesta incompleta");
  return data.hub;
}

export async function applyPlaySessionProposal(
  code: string,
  participantId: string,
  playSessionId: string,
  proposal?: SessionAiProposal
): Promise<{ proposal: SessionAiProposal; hub: HubView }> {
  const res = await fetch(
    apiUrl(
      `/api/sessions/${encodeURIComponent(code.toUpperCase())}/play-sessions/${encodeURIComponent(playSessionId)}/apply-proposal`
    ),
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ participantId, proposal }),
    }
  );
  const data = await readJson<{
    ok?: boolean;
    error?: string;
    proposal?: SessionAiProposal;
    hub?: HubView;
  }>(res);
  if (!res.ok) throw new Error(data.error ?? "No se pudo aplicar la propuesta");
  if (!data.proposal || !data.hub) throw new Error("Respuesta incompleta del servidor");
  return { proposal: data.proposal, hub: data.hub };
}


export async function downloadCampaignExport(
  code: string,
  participantId: string,
  format: "markdown" | "html"
): Promise<void> {
  const params = new URLSearchParams({ participantId, format });
  const res = await fetch(
    apiUrl(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/export?${params}`),
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await parseError(res, "No se pudo exportar"));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${code.toUpperCase()}-campana.${format === "html" ? "html" : "md"}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function suggestNpc(
  code: string,
  participantId: string,
  hint?: string
): Promise<NpcSuggestion> {
  const res = await fetch(
    apiUrl(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/hub/suggest-npc`),
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ participantId, hint }),
    }
  );
  const data = await readJson<{ ok?: boolean; error?: string; suggestion?: NpcSuggestion }>(res);
  if (!res.ok) throw new Error(data.error ?? "Error IA");
  if (!data.suggestion) throw new Error("Sin sugerencia");
  return data.suggestion;
}

export async function updateCharacter(
  code: string,
  participantId: string,
  patch: CharacterPatch,
  targetParticipantId?: string
): Promise<HubView> {
  const base = apiUrl(
    `/api/sessions/${encodeURIComponent(code.toUpperCase())}/hub/character`
  );
  const res = await fetch(`${base}?participantId=${encodeURIComponent(participantId)}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ targetParticipantId, patch }),
  });
  if (!res.ok) throw new Error(await parseError(res, "No se pudo guardar personaje"));
  return assertHubView(await readJson(res));
}
