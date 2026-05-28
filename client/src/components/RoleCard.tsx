import type { Role } from "../types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../types";

const ROLE_ICONS: Record<Role, string> = {
  master: "👑",
  player: "⚔️",
  observer: "👁️",
};

interface RoleCardProps {
  role: Role;
  selected: boolean;
  disabled?: boolean;
  /** Texto cuando está deshabilitado (si no se pasa, no muestra aviso rojo) */
  disabledHint?: string;
  onSelect: () => void;
}

export function RoleCard({
  role,
  selected,
  disabled,
  disabledHint,
  onSelect,
}: RoleCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        "w-full rounded-xl border p-4 text-left transition",
        selected
          ? "border-[var(--color-gold)] bg-[#2a2418] shadow-[0_0_0_1px_var(--color-gold)]"
          : "border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] hover:border-[var(--color-mist)]",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {ROLE_ICONS[role]}
        </span>
        <div>
          <p className="font-display text-lg text-[var(--color-gold)]">
            {ROLE_LABELS[role]}
          </p>
          <p className="mt-1 text-sm text-[var(--color-mist)]">
            {ROLE_DESCRIPTIONS[role]}
          </p>
          {disabled && disabledHint && (
            <p className="mt-2 text-xs text-[var(--color-ember)]">{disabledHint}</p>
          )}
        </div>
      </div>
    </button>
  );
}
