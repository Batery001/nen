import type { SessionSnapshot } from "./types";

export async function createSession(): Promise<SessionSnapshot> {
  const res = await fetch("/api/sessions", { method: "POST" });
  if (!res.ok) throw new Error("No se pudo crear la partida");
  return res.json();
}

export async function getSessionByCode(code: string): Promise<SessionSnapshot> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("Partida no encontrada");
  return res.json();
}
