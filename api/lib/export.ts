import type { GameSession } from "./types.js";
import { ensureHubFields } from "./migrate.js";
import { buildCampaignTimeline } from "./timeline.js";
import { WIKI_TYPE_LABELS } from "./labels.js";

export function exportCampaignMarkdown(session: GameSession): string {
  const s = ensureHubFields(session);
  const lines: string[] = [
    `# ${s.campaignTitle}`,
    "",
    `Código: **${s.code}**`,
    `Creada: ${new Date(s.createdAt).toLocaleString("es")}`,
    "",
  ];

  if (s.campaignSummary) {
    lines.push("## Resumen de campaña", "", s.campaignSummary, "");
  }

  lines.push("## Timeline", "");
  for (const ev of buildCampaignTimeline(s)) {
    const date = new Date(ev.date).toLocaleDateString("es");
    if (ev.kind === "session") {
      lines.push(`- **${date}** — Sesión: ${ev.title}${ev.published ? "" : " _(borrador)_"}`);
      if (ev.summary) lines.push(`  - ${ev.summary}`);
    } else if (ev.kind === "wiki") {
      lines.push(`- **${date}** — ${WIKI_TYPE_LABELS[ev.wikiType!]}: ${ev.title}`);
    } else {
      lines.push(`- **${date}** — ${ev.title}`);
    }
  }

  lines.push("", "## Sesiones jugadas", "");
  if (s.playSessions.length === 0) {
    lines.push("_Sin sesiones registradas._", "");
  } else {
    for (const ps of s.playSessions) {
      lines.push(`### ${ps.title}`, "");
      if (ps.playedAt) lines.push(`_Jugada: ${new Date(ps.playedAt).toLocaleString("es")}_`, "");
      if (ps.audioUrl) lines.push(`Audio: ${ps.audioUrl}`, "");
      lines.push(ps.summary || "_Sin resumen._", "");
    }
  }

  lines.push("## Wiki", "");
  if (s.wiki.length === 0) {
    lines.push("_Vacía._", "");
  } else {
    for (const w of s.wiki) {
      lines.push(`### ${WIKI_TYPE_LABELS[w.type]}: ${w.title}`, "");
      lines.push(w.body || "", "");
    }
  }

  lines.push("## Personajes", "");
  for (const c of s.characters) {
    lines.push(`### ${c.characterName || c.playerName}`, "");
    lines.push(`Jugador: ${c.playerName}`, "");
    if (c.bio) lines.push(c.bio, "");
    if (c.privateNotes) lines.push("_Notas master:_", c.privateNotes, "");
  }

  lines.push("", "---", "_Exportado desde Niku_");
  return lines.join("\n");
}

export function exportCampaignHtml(session: GameSession): string {
  const md = exportCampaignMarkdown(session);
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${session.campaignTitle}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;line-height:1.5;color:#1a1a1a}h1,h2,h3{color:#5c4a1f}</style>
</head><body><p>${escaped}</p></body></html>`;
}
