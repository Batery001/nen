import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSessionAsMaster } from "../api";
import { useAuth } from "../context/AuthContext";
import { RoleCard } from "../components/RoleCard";
import { saveStoredSession } from "../hooks/useSessionStorage";

export function CreateSession() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setName((prev) => (prev.trim() ? prev : user.displayName));
    }
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[var(--color-mist)]">
          Necesitas un perfil para crear una campaña y ser su dueño permanente.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-lg bg-[var(--color-gold)] px-6 py-2.5 font-semibold text-[var(--color-ink)]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createSessionAsMaster(name.trim());

      if (!result.ok || !result.session || !result.you) {
        setError(result.error ?? "Error al crear la partida");
        return;
      }

      saveStoredSession({
        sessionId: result.session.id,
        code: result.session.code,
        participantId: result.you.participantId,
        role: result.you.role,
        name: name.trim(),
      });

      navigate(`/hub/${result.session.code}`, { state: { session: result.session } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(
        msg.includes("MONGODB") || msg.includes("mongo") || msg.includes("querySrv")
          ? `${msg}. Revisa MONGODB_URI en Vercel y Network Access en Atlas (0.0.0.0/0).`
          : msg || "No se pudo crear la partida"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Crear campaña</h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Serás el <strong className="text-[var(--color-gold)]">dueño</strong> de la campaña.
          Puedes salir y volver sin perder el master.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Tu nombre en la mesa</span>
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
        <RoleCard
          role="master"
          selected
          disabled
          disabledHint="Dueño de la campaña con acceso total"
          onSelect={() => {}}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">{error}</p>
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
