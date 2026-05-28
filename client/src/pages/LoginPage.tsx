import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestLoginCode, verifyLoginCode } from "../api";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await requestLoginCode(email.trim(), displayName.trim() || undefined);
      if (!result.ok) {
        setError(result.error ?? "No se pudo enviar el código");
        return;
      }
      if (result.devCode) setDevCode(result.devCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyLoginCode(email.trim(), code.trim());
      if (!result.ok || !result.token || !result.user) {
        setError(result.error ?? "Código incorrecto");
        return;
      }
      login(result.token, result.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[var(--color-gold)]">Tu perfil</h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Entra con tu email. Sin contraseña: te enviamos un código de un solo uso.
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5"
              placeholder="tu@email.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Nombre para mostrar (opcional)</span>
            <input
              type="text"
              maxLength={32}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5"
              placeholder="Ej. Gandalf"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-gold)] py-3 font-semibold text-[var(--color-ink)] disabled:opacity-50"
          >
            {loading ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-[var(--color-mist)]">
            Código enviado a <strong className="text-[var(--color-parchment)]">{email}</strong>
          </p>
          {devCode && (
            <p className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              Modo desarrollo — tu código: <span className="font-mono font-bold">{devCode}</span>
            </p>
          )}
          <label className="block">
            <span className="text-sm font-medium">Código de 6 dígitos</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-4 py-2.5 font-mono tracking-[0.3em] text-center text-lg"
            />
          </label>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-[var(--color-gold)] py-3 font-semibold text-[var(--color-ink)] disabled:opacity-50"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-sm text-[var(--color-mist)] hover:text-[var(--color-parchment)]"
          >
            Cambiar email
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-200">{error}</p>
      )}

      <p className="text-center text-sm text-[var(--color-mist)]">
        <Link to="/" className="text-[var(--color-gold)] hover:underline">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
