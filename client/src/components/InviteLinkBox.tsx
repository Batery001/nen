import { useState } from "react";

export function InviteLinkBox({ inviteUrl, code }: { inviteUrl?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    inviteUrl ??
    `${window.location.origin}/unirse?code=${encodeURIComponent(code.toUpperCase())}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-[var(--color-slate-border)] bg-[#121018] p-3 space-y-2">
      <p className="text-sm font-medium text-[var(--color-gold)]">Enlace de invitación</p>
      <p className="text-xs text-[var(--color-mist)]">
        Comparte con jugadores y observadores. Los jugadores necesitan aprobación del master.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded border border-[var(--color-slate-border)] bg-black/30 px-2 py-1 text-xs font-mono"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded border border-[var(--color-gold)] px-3 py-1 text-xs text-[var(--color-gold)]"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
