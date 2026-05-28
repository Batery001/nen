import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionByCode } from "../api";
import { RoleCard } from "../components/RoleCard";
import { joinSession } from "../api";
import { saveStoredSession } from "../hooks/useSessionStorage";
import type { Role, SessionSnapshot } from "../types";

export function JoinSession() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("player");
  const [preview, setPreview] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code.trim().length < 4) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const session = await getSessionByCode(code.trim());
        setPreview(session);
        if (!session.rolesAvailable.master && role === "master") {
          setRole("player");
        }
        setError(null);
      } catch {
        setPreview(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code, role]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await joinSession({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        role,
      });

      if (!result.ok || !result.session || !result.you) {
        setError(result.error ?? "No se pudo unir");
        return;
      }

      saveStoredSession({
        sessionId: result.session.id,
        code: result.session.code,
        participantId: result.you.participantId,
        role: result.you.role,
        name: name.trim(),
      });

      navigate(`/partida/${result.session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const roles: Role[] = ["master", "player", "observer"];

  return (
    <form onSubmit={handleJoin} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Unirse a partida</h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Pide el código al master e indica cómo quieres participar.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Código de partida</span>
        <input
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ej. K7X2M9"
          className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5 font-mono tracking-widest uppercase outline-none focus:border-[var(--color-gold)]"
        />
        {preview && (
          <p className="mt-1 text-xs text-emerald-400/90">
            Partida encontrada · {preview.participants.length} conectado
            {preview.participants.length !== 1 ? "s" : ""}
          </p>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Tu nombre</span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Aragorn"
          className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5 outline-none focus:border-[var(--color-gold)]"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Elige tu rol</legend>
        <div className="space-y-3">
          {roles.map((r) => (
            <RoleCard
              key={r}
              role={r}
              selected={role === r}
              disabled={
                r === "master" && preview !== null && !preview.rolesAvailable.master
              }
              disabledHint={
                r === "master" && preview !== null && !preview.rolesAvailable.master
                  ? "Ya hay un master en esta partida"
                  : undefined
              }
              onSelect={() => setRole(r)}
            />
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || name.trim().length < 2 || code.trim().length < 4}
        className="w-full rounded-lg bg-[var(--color-gold)] py-3 font-semibold text-[var(--color-ink)] transition hover:bg-[#dbb52e] disabled:opacity-50"
      >
        {loading ? "Conectando…" : "Entrar a la partida"}
      </button>
    </form>
  );
}
