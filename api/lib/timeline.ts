import type { GameSession, TimelineEvent } from "./types.js";
import { ensureHubFields } from "./migrate.js";

export function buildCampaignTimeline(session: GameSession): TimelineEvent[] {
  const s = ensureHubFields(session);
  const events: TimelineEvent[] = [];

  events.push({
    id: "campaign-start",
    kind: "campaign",
    date: s.createdAt,
    title: "Inicio de campaña",
    summary: s.campaignSummary?.slice(0, 200) || undefined,
  });

  for (const ps of s.playSessions) {
    events.push({
      id: ps.id,
      kind: "session",
      date: ps.playedAt || s.createdAt,
      title: ps.title,
      summary: ps.summary?.slice(0, 160) || undefined,
      published: ps.published,
    });
  }

  for (const w of s.wiki) {
    events.push({
      id: w.id,
      kind: "wiki",
      date: w.createdAt ?? s.createdAt,
      title: w.title,
      summary: w.body?.slice(0, 120) || undefined,
      wikiType: w.type,
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
