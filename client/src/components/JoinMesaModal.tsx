import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinSession } from "../api";
import { savePendingRequest } from "../hooks/usePendingStorage";
import { saveStoredSession } from "../hooks/useSessionStorage";
import type { SessionListItem } from "../types";

interface JoinMesaModalProps {
  mesa: SessionListItem;
  onClose: () => void;
}

export function JoinMesaModal({ mesa, onClose }: JoinMesaModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<"observer" | "player" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterAsObserver() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLoading("observer");
    setError(null);
    try {
      const result = await joinSession({
        code: mesa.code,
        name: trimmed,
        role: "observer",
        sessionId: mesa.id,
      });
      if (!result.ok || !result.session || !result.you) {
        setError(result.error ?? "No se pudo entrar");
        return;
      }
      saveStoredSession({
        sessionId: result.session.id,
        code: result.session.code,
        participantId: result.you.participantId,
        role: result.you.role,
        name: trimmed,
      });
      navigate(`/hub/${result.session.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  async function requestAsPlayer() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLoading("player");
    setError(null);
    try {
      const result = await joinSession({
        code: mesa.code,
        name: trimmed,
        role: "player",
        sessionId: mesa.id,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo enviar la solicitud");
        return;
      }
      if (result.pending && result.requestId && result.session) {
        savePendingRequest({
          requestId: result.requestId,
          code: result.session.code,
          sessionId: result.session.id,
          name: trimmed,
        });
        navigate(`/espera/${result.session.code}`);
        return;
      }
      if (result.you && result.session) {
        saveStoredSession({
          sessionId: result.session.id,
          code: result.session.code,
          participantId: result.you.participantId,
          role: result.you.role,
          name: trimmed,
        });
        navigate(`/hub/${result.session.code}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-mesa-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6 shadow-xl">
        <h2 id="join-mesa-title" className="font-display text-xl text-[var(--color-gold)]">
          {mesa.campaignTitle}
        </h2>
        <p className="mt-1 font-mono text-sm text-[var(--color-mist)]">Código {mesa.code}</p>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Tu nombre</span>
          <input
            type="text"
            minLength={2}
            maxLength={32}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            placeholder="Cómo te verán en la mesa"
            autoFocus
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
        )}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={enterAsObserver}
            className="w-full rounded-lg border border-[var(--color-gold-dim)] py-2.5 text-sm font-medium transition hover:border-[var(--color-gold)] disabled:opacity-50"
          >
            {loading === "observer" ? "Entrando…" : "Entrar como observador"}
          </button>
          <p className="text-center text-xs text-[var(--color-mist)]">
            Acceso inmediato — solo resumen y audio
          </p>

          <button
            type="button"
            disabled={loading !== null}
            onClick={requestAsPlayer}
            className="w-full rounded-lg bg-[var(--color-gold)] py-2.5 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
          >
            {loading === "player" ? "Enviando…" : "Solicitar entrar como jugador"}
          </button>
          <p className="text-center text-xs text-[var(--color-mist)]">
            El master debe aprobar tu solicitud
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm text-[var(--color-mist)] hover:text-[var(--color-parchment)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
