import { Link } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      <header className="mb-10 text-center">
        <Link to="/" className="inline-block">
          <h1 className="font-display text-4xl tracking-wide text-[var(--color-gold)]">
            Nen
          </h1>
          <p className="mt-1 text-sm text-[var(--color-mist)]">
            Wiki y memoria de tu campaña
          </p>
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
