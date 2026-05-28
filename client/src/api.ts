import type { SessionSnapshot } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

export async function createSession(): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl("/api/sessions"), { method: "POST" });
  if (!res.ok) throw new Error("No se pudo crear la partida");
  return res.json();
}

export async function getSessionByCode(code: string): Promise<SessionSnapshot> {
  const res = await fetch(apiUrl(`/api/sessions/${encodeURIComponent(code)}`));
  if (!res.ok) throw new Error("Partida no encontrada");
  return res.json();
}
