import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getJoinRequestStatus } from "../api";
import { saveStoredSession } from "../hooks/useSessionStorage";
import { clearPendingRequest, loadPendingRequest } from "../hooks/usePendingStorage";

export function WaitingApprovalPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const pending = code ? loadPendingRequest(code) : null;
  const [message, setMessage] = useState("Esperando aprobación del master…");
  const [rejected, setRejected] = useState(false);

  const poll = useCallback(async () => {
    if (!code || !pending) return;
    try {
      const result = await getJoinRequestStatus(code, pending.requestId);
      if (result.pending) return;

      if (!result.ok) {
        setRejected(true);
        setMessage(result.error ?? "Solicitud rechazada");
        clearPendingRequest();
        return;
      }

      if (result.you && result.session) {
        saveStoredSession({
          sessionId: result.session.id,
          code: result.session.code,
          participantId: result.you.participantId,
          role: result.you.role,
          name: pending.name,
        });
        clearPendingRequest();
        navigate(`/hub/${result.session.code}`, { replace: true });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al consultar");
    }
  }, [code, pending, navigate]);

  useEffect(() => {
    if (!pending) return;
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll, pending]);

  if (!code) {
    return <p className="text-center text-red-300">Código inválido</p>;
  }

  if (!pending) {
    return (
      <div className="space-y-4 text-center">
        <p>No hay solicitud pendiente para esta mesa.</p>
        <Link to="/" className="text-[var(--color-gold)]">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h2 className="font-display text-2xl text-[var(--color-gold)]">
        Solicitud enviada
      </h2>
      <p className="text-sm text-[var(--color-mist)]">
        Mesa <span className="font-mono text-[var(--color-parchment)]">{code}</span> ·{" "}
        {pending.name}
      </p>
      {!rejected ? (
        <div className="rounded-xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-gold)] border-t-transparent"
            aria-hidden
          />
          <p className="mt-4 text-sm">{message}</p>
          <p className="mt-2 text-xs text-[var(--color-mist)]">
            El master debe aprobar tu entrada como jugador desde el hub.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-red-950/50 px-4 py-3 text-sm text-red-200">{message}</p>
      )}
      <Link to="/" className="inline-block text-sm text-[var(--color-gold)] hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
