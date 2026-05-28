import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getSessionByCode, leaveSession } from "../api";
import { ParticipantList } from "../components/ParticipantList";
import {
  clearStoredSession,
  loadStoredSession,
  type StoredSession,
} from "../hooks/useSessionStorage";
import { ROLE_LABELS, type SessionSnapshot } from "../types";

const POLL_MS = 2000;

export function SessionRoom() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const initialSession = (location.state as { session?: SessionSnapshot } | null)?.session;

  const [session, setSession] = useState<SessionSnapshot | null>(initialSession ?? null);
  const [stored, setStored] = useState<StoredSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(!initialSession);

  useEffect(() => {
    setStored(loadStoredSession());
  }, []);

  useEffect(() => {
    if (!code) return;

    let active = true;
    let attempts = 0;
    const maxAttempts = 8;
    const hasInitial = Boolean(initialSession);

    async function refresh() {
      try {
        const data = await getSessionByCode(code);
        if (active) {
          setSession(data);
          setError(null);
          setRetrying(false);
        }
      } catch (err) {
        if (!active) return;
        attempts += 1;
        if (attempts < maxAttempts) {
          if (hasInitial) setRetrying(true);
        } else {
          setError(err instanceof Error ? err.message : "Partida no encontrada");
          setRetrying(false);
        }
      }
    }

    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code, initialSession]);

  function copyCode() {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    if (stored && code) {
      try {
        await leaveSession(code, stored.participantId);
      } catch {
        /* salir igual aunque falle el servidor */
      }
    }
    clearStoredSession();
    window.location.href = "/";
  }

  if (error && !session) {
    return (
      <div className="text-center">
        <p className="text-red-300">{error}</p>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Comprueba /api/health en Vercel (mongo: connected) y que MONGODB_URI sea correcta.
        </p>
        <Link to="/" className="mt-4 inline-block text-[var(--color-gold)]">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="text-center text-[var(--color-mist)]">
        {retrying ? "Sincronizando partida con el servidor…" : "Cargando partida…"}
      </p>
    );
  }

  const isYou = stored?.participantId;

  return (
    <div className="space-y-6">
      {retrying && (
        <p className="text-center text-xs text-amber-400/90">Reconectando con el servidor…</p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-mist)]">Código de partida</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-display text-3xl tracking-[0.2em] text-[var(--color-gold)]">
              {session.code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-md border border-[var(--color-slate-border)] px-3 py-1 text-xs hover:border-[var(--color-gold)]"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
        {stored && (
          <div className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] px-4 py-2 text-sm">
            <span className="text-[var(--color-mist)]">Tú: </span>
            <span className="font-medium">{stored.name}</span>
            <span className="mx-2 text-[var(--color-mist)]">·</span>
            <span className="text-[var(--color-gold)]">{ROLE_LABELS[stored.role]}</span>
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6">
        <h2 className="font-display text-lg text-[var(--color-parchment)]">
          Conectados ({session.participants.length})
        </h2>
        <div className="mt-4">
          <ParticipantList participants={session.participants} highlightId={isYou} />
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-mist)]">
          La lista se actualiza cada pocos segundos
        </p>
      </section>

      <p className="text-center text-sm text-[var(--color-mist)]">
        {stored?.role === "observer" &&
          "Como observador ves la partida sin intervenir (por ahora)."}
        {stored?.role === "master" &&
          "Eres el master. Comparte el código para que se unan jugadores u observadores."}
        {stored?.role === "player" && "Estás en la mesa como jugador."}
        {!stored && (
          <>
            Estás viendo la partida sin estar conectado.{" "}
            <Link to="/unirse" className="text-[var(--color-gold)]">
              Únete con un rol
            </Link>
          </>
        )}
      </p>

      {stored && (
        <button
          type="button"
          onClick={handleLeave}
          className="w-full rounded-lg border border-[var(--color-slate-border)] py-2.5 text-sm text-[var(--color-mist)] hover:border-[var(--color-ember)] hover:text-red-200"
        >
          Salir de la partida
        </button>
      )}
    </div>
  );
}
