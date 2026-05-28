import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-8 text-center">
        <h2 className="font-display text-2xl text-[var(--color-parchment)]">
          Crea o únete a una partida
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--color-mist)]">
          Genera una sala, comparte el código y conéctate como master, jugador u
          observador en tiempo real.
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
            Crear partida
          </h3>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Genera un código y entra como master
          </p>
        </Link>

        <Link
          to="/unirse"
          className="group rounded-2xl border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-6 text-center transition hover:border-[var(--color-mist)]"
        >
          <span className="text-3xl" aria-hidden>
            🎲
          </span>
          <h3 className="mt-3 font-display text-xl">Unirse a partida</h3>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Introduce el código y elige tu rol
          </p>
        </Link>
      </div>
    </div>
  );
}
