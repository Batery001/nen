import { WIKI_TYPE_LABELS, type TimelineEvent } from "../types";

export function CampaignTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-[var(--color-mist)]">Aún no hay eventos en la timeline.</p>;
  }

  return (
    <ol className="relative border-l border-[var(--color-slate-border)] ml-2 space-y-4">
      {events.map((ev) => (
        <li key={ev.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-[var(--color-gold)]" />
          <p className="text-xs text-[var(--color-mist)]">
            {new Date(ev.date).toLocaleDateString("es", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="font-medium text-sm">
            {ev.kind === "wiki" && ev.wikiType
              ? `${WIKI_TYPE_LABELS[ev.wikiType]}: `
              : ev.kind === "session"
                ? "Sesión: "
                : ""}
            {ev.title}
            {ev.kind === "session" && ev.published === false && (
              <span className="text-xs text-amber-400 ml-1">(borrador)</span>
            )}
          </p>
          {ev.summary && (
            <p className="text-xs text-[var(--color-mist)] mt-0.5 line-clamp-2">{ev.summary}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
