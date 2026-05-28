import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api";
import { RoleCard } from "../components/RoleCard";
import { joinSession } from "../api";
import { saveStoredSession } from "../hooks/useSessionStorage";

export function CreateSession() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await createSession();
      const result = await joinSession({
        code: session.code,
        sessionId: session.id,
        name: name.trim(),
        role: "master",
      });

      if (!result.ok || !result.session || !result.you) {
        setError(result.error ?? "Error al conectar");
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
    } catch {
      setError("No se pudo crear la partida. ¿Está el servidor en marcha?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Crear partida</h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Al crear la partida entrarás automáticamente como master.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Tu nombre</span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Gandalf"
          className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5 outline-none focus:border-[var(--color-gold)]"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Tu rol</p>
        <RoleCard role="master" selected disabled onSelect={() => {}} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || name.trim().length < 2}
        className="w-full rounded-lg bg-[var(--color-gold)] py-3 font-semibold text-[var(--color-ink)] transition hover:bg-[#dbb52e] disabled:opacity-50"
      >
        {loading ? "Creando…" : "Crear y entrar"}
      </button>
    </form>
  );
}
