import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-8 text-center">
        <h2 className="font-display text-2xl text-[var(--color-parchment)]">
          Hub de campaña
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--color-mist)]">
          Jugáis por Discord, llamada o en persona. Aquí documentáis la campaña: wiki,
          resúmenes y audio para escuchar como audiolibro.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/crear"
          className="group rounded-2xl border border-[var(--color-gold-dim)] bg-gradient-to-b from-[#2a2418] to-[var(--color-slate-panel)] p-6 text-center transition hover:border-[var(--color-gold)]"
        >
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <h3 className="mt-3 font-display text-xl text-[var(--color-gold)]">
            Crear campaña
          </h3>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Eres el master con acceso total al hub
          </p>
        </Link>

        <Link
          to="/unirse"
          className="group rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6 text-center transition hover:border-[var(--color-mist)]"
        >
          <span className="text-3xl" aria-hidden>
            🎲
          </span>
          <h3 className="mt-3 font-display text-xl">Unirse</h3>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Jugador (su personaje) u observador (solo escuchar)
          </p>
        </Link>
      </div>

      <section className="rounded-xl border border-[var(--color-slate-border)] bg-[#121018] p-4 text-sm text-[var(--color-mist)]">
        <p className="font-medium text-[var(--color-parchment)]">Roles</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <strong className="text-[var(--color-gold)]">Master</strong> — edita wiki,
            resúmenes, audio y sesiones
          </li>
          <li>
            <strong>Jugador</strong> — solo su ficha; lee lo publicado
          </li>
          <li>
            <strong>Observador</strong> — resumen y audio (modo audiolibro)
          </li>
        </ul>
      </section>
    </div>
  );
}
