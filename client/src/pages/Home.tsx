import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSessions } from "../api";
import { JoinMesaModal } from "../components/JoinMesaModal";
import { loadStoredSession } from "../hooks/useSessionStorage";
import type { SessionListItem } from "../types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function Home() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<SessionListItem | null>(null);
  const stored = loadStoredSession();

  const load = useCallback(async () => {
    try {
      const items = await listSessions();
      setSessions(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar mesas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6 sm:p-8">
        <h2 className="font-display text-2xl text-center text-[var(--color-parchment)]">
          Mesas de campaña
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-[var(--color-mist)]">
          Elige una mesa para entrar como observador al instante, o envía una solicitud al
          master para jugar.
        </p>
        {stored && (
          <p className="mt-4 text-center text-sm">
            <Link
              to={`/hub/${stored.code}`}
              className="text-[var(--color-gold)] hover:underline"
            >
              Volver a tu mesa ({stored.code}) — {stored.name}
            </Link>
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-[var(--color-gold)]">
          Todas las mesas
        </h3>
        <Link
          to="/crear"
          className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
        >
          + Crear campaña
        </Link>
      </div>

      {loading && (
        <p className="text-center text-sm text-[var(--color-mist)]">Cargando mesas…</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-950/50 px-4 py-2 text-center text-sm text-red-200">
          {error}
        </p>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--color-slate-border)] p-8 text-center text-sm text-[var(--color-mist)]">
          Aún no hay mesas.{" "}
          <Link to="/crear" className="text-[var(--color-gold)]">
            Crea la primera campaña
          </Link>
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {sessions.map((mesa) => (
          <li key={mesa.id}>
            <button
              type="button"
              onClick={() => setSelectedMesa(mesa)}
              className="group w-full rounded-xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-4 text-left transition hover:border-[var(--color-gold-dim)]"
            >
              <p className="font-display text-lg text-[var(--color-parchment)] group-hover:text-[var(--color-gold)]">
                {mesa.campaignTitle}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--color-mist)]">{mesa.code}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-mist)]">
                <span>
                  {mesa.participantCount} en la mesa
                </span>
                <span>{formatDate(mesa.createdAt)}</span>
                {mesa.pendingPlayerRequests > 0 && (
                  <span className="text-amber-400/90">
                    {mesa.pendingPlayerRequests} solicitud
                    {mesa.pendingPlayerRequests !== 1 ? "es" : ""} pendiente
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedMesa && (
        <JoinMesaModal mesa={selectedMesa} onClose={() => setSelectedMesa(null)} />
      )}

      <section className="rounded-xl border border-[var(--color-slate-border)] bg-[#121018] p-4 text-sm text-[var(--color-mist)]">
        <p className="font-medium text-[var(--color-parchment)]">Cómo entrar</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong className="text-[var(--color-gold)]">Observador</strong> — entrada
            inmediata; solo resumen y audio
          </li>
          <li>
            <strong>Jugador</strong> — el master aprueba tu solicitud desde el hub
          </li>
          <li>
            <strong>Master</strong> — solo al crear una campaña nueva
          </li>
        </ul>
      </section>
    </div>
  );
}
