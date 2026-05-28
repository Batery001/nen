import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      <header className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-block">
            <h1 className="font-display text-4xl tracking-wide text-[var(--color-gold)]">
              Nen
            </h1>
            <p className="mt-1 text-sm text-[var(--color-mist)]">
              Wiki y memoria de tu campaña
            </p>
          </Link>
          {!loading && (
            <div className="text-right text-sm">
              {user ? (
                <>
                  <p className="text-[var(--color-parchment)]">{user.displayName}</p>
                  <p className="text-xs text-[var(--color-mist)]">{user.email}</p>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="mt-1 text-xs text-[var(--color-gold)] hover:underline"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-[var(--color-gold)] hover:underline">
                  Iniciar sesión
                </Link>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
