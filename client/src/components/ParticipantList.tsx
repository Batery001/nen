import type { Participant, Role } from "../types";
import { ROLE_LABELS } from "../types";

const ROLE_BADGE: Record<Role, string> = {
  master: "bg-amber-900/50 text-amber-200",
  player: "bg-emerald-900/40 text-emerald-200",
  observer: "bg-slate-700/50 text-slate-300",
};

interface ParticipantListProps {
  participants: Participant[];
  highlightId?: string;
}

export function ParticipantList({ participants, highlightId }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-mist)]">
        Nadie conectado todavía. Comparte el código de la partida.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {participants.map((p) => (
        <li
          key={p.id}
          className={[
            "flex items-center justify-between rounded-lg border px-4 py-3",
            p.id === highlightId
              ? "border-[var(--color-gold)] bg-[#252018]"
              : "border-[var(--color-slate-border)] bg-[var(--color-slate-panel)]",
          ].join(" ")}
        >
          <span className="font-medium">{p.name}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[p.role]}`}
          >
            {ROLE_LABELS[p.role]}
          </span>
        </li>
      ))}
    </ul>
  );
}
