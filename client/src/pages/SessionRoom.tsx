import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSessionByCode } from "../api";
import { ParticipantList } from "../components/ParticipantList";
import { getSocket } from "../socket";
import {
  clearStoredSession,
  loadStoredSession,
  type StoredSession,
} from "../hooks/useSessionStorage";
import { ROLE_LABELS, type SessionSnapshot } from "../types";

export function SessionRoom() {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [stored, setStored] = useState<StoredSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStored(loadStoredSession());
  }, []);

  useEffect(() => {
    if (!code) return;

    getSessionByCode(code)
      .then(setSession)
      .catch(() => setError("Partida no encontrada"));

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const onUpdate = (snapshot: SessionSnapshot) => {
      if (snapshot.code === code.toUpperCase()) {
        setSession(snapshot);
      }
    };

    socket.on("session:updated", onUpdate);
    return () => {
      socket.off("session:updated", onUpdate);
    };
  }, [code]);

  function copyCode() {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function leaveSession() {
    getSocket().disconnect();
    clearStoredSession();
    window.location.href = "/";
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-300">{error}</p>
        <Link to="/" className="mt-4 inline-block text-[var(--color-gold)]">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!session) {
    return <p className="text-center text-[var(--color-mist)]">Cargando partida…</p>;
  }

  const isYou = stored?.participantId;

  return (
    <div className="space-y-6">
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
          <ParticipantList
            participants={session.participants}
            highlightId={isYou}
          />
        </div>
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
          onClick={leaveSession}
          className="w-full rounded-lg border border-[var(--color-slate-border)] py-2.5 text-sm text-[var(--color-mist)] hover:border-[var(--color-ember)] hover:text-red-200"
        >
          Salir de la partida
        </button>
      )}
    </div>
  );
}
