import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMyCampaigns, listSessions, rejoinCampaign } from "../api";
import { JoinMesaModal } from "../components/JoinMesaModal";
import { useAuth } from "../context/AuthContext";
import { saveStoredSession } from "../hooks/useSessionStorage";
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

function MesaCard({
  mesa,
  onSelect,
  badge,
}: {
  mesa: SessionListItem;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-4 text-left transition hover:border-[var(--color-gold-dim)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg text-[var(--color-parchment)] group-hover:text-[var(--color-gold)]">
          {mesa.campaignTitle}
        </p>
        {badge && (
          <span className="shrink-0 rounded bg-[#2a2418] px-2 py-0.5 text-xs text-[var(--color-gold)]">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-xs text-[var(--color-mist)]">{mesa.code}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-mist)]">
        <span>{mesa.connectedCount} conectados</span>
        <span>{formatDate(mesa.createdAt)}</span>
        {mesa.pendingPlayerRequests > 0 && (
          <span className="text-amber-400/90">
            {mesa.pendingPlayerRequests} solicitud
            {mesa.pendingPlayerRequests !== 1 ? "es" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mine, setMine] = useState<SessionListItem[]>([]);
  const [publicMesas, setPublicMesas] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [mineError, setMineError] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<SessionListItem | null>(null);
  const [rejoining, setRejoining] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPublicError(null);
    setMineError(null);
    try {
      const pub = await listSessions();
      setPublicMesas(pub);
    } catch (e) {
      setPublicMesas([]);
      setPublicError(e instanceof Error ? e.message : "Error al cargar mesas");
    }
    if (user) {
      try {
        const owned = await listMyCampaigns();
        setMine(owned);
      } catch (e) {
        setMineError(e instanceof Error ? e.message : "Error al cargar tus campañas");
      }
    } else {
      setMine([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function handleRejoin(mesa: SessionListItem) {
    if (!user) {
      navigate("/login");
      return;
    }
    setRejoining(mesa.code);
    try {
      const result = await rejoinCampaign(mesa.code);
      if (!result.ok || !result.session || !result.you) {
        setError(result.error ?? "No se pudo reingresar");
        return;
      }
      saveStoredSession({
        sessionId: result.session.id,
        code: result.session.code,
        participantId: result.you.participantId,
        role: result.you.role,
        name: user.displayName,
      });
      navigate(`/hub/${result.session.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRejoining(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6 sm:p-8 text-center">
        <h2 className="font-display text-2xl text-[var(--color-parchment)]">
          Hub de campaña
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-mist)]">
          Crea campañas con tu perfil, reingresa cuando quieras y gestiona solicitudes de
          jugadores aunque te desconectes.
        </p>
      </section>

      {user && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg text-[var(--color-gold)]">Mis campañas</h3>
            <Link
              to="/crear"
              className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              + Crear campaña
            </Link>
          </div>
          {mine.length === 0 && !loading && (
            <p className="text-sm text-[var(--color-mist)]">
              Aún no tienes campañas.{" "}
              <Link to="/crear" className="text-[var(--color-gold)]">
                Crea la primera
              </Link>
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {mine.map((mesa) => (
              <li key={mesa.id}>
                <MesaCard
                  mesa={mesa}
                  badge={mesa.isOwner ? "Dueño" : mesa.myRole ?? "Miembro"}
                  onSelect={() => handleRejoin(mesa)}
                />
                {rejoining === mesa.code && (
                  <p className="mt-1 text-center text-xs text-[var(--color-mist)]">
                    Reingresando…
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!user && (
        <p className="rounded-xl border border-[var(--color-gold-dim)] bg-[#2a2418]/50 p-4 text-center text-sm">
          <Link to="/login" className="font-medium text-[var(--color-gold)]">
            Inicia sesión
          </Link>{" "}
          para crear campañas, ser dueño permanente y reingresar sin perder el master.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg text-[var(--color-parchment)]">
          Explorar campañas
        </h3>
        {loading && (
          <p className="text-center text-sm text-[var(--color-mist)]">Cargando…</p>
        )}
        {mineError && (
          <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">{mineError}</p>
        )}
        {publicError && (
          <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">
            {publicError}
          </p>
        )}
        {!loading && !publicError && publicMesas.length === 0 && (
          <p className="text-sm text-[var(--color-mist)]">No hay campañas para explorar aún.</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {publicMesas.map((mesa) => (
            <li key={mesa.id}>
              <MesaCard mesa={mesa} onSelect={() => setSelectedMesa(mesa)} />
            </li>
          ))}
        </ul>
      </section>

      {selectedMesa && (
        <JoinMesaModal mesa={selectedMesa} onClose={() => setSelectedMesa(null)} />
      )}
    </div>
  );
}
