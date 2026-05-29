import type { GameSession, PlaySessionRecord, SessionAiProposal } from "../types.js";
import { ensureCharacter } from "../hub.js";
import { ensureHubFields } from "../migrate.js";

export function findPlaySession(
  session: GameSession,
  playSessionId: string
): PlaySessionRecord | undefined {
  return ensureHubFields(session).playSessions.find((p) => p.id === playSessionId);
}

export function applySessionProposal(
  campaign: GameSession,
  playSessionId: string,
  proposal: SessionAiProposal
): void {
  const s = ensureHubFields(campaign);
  const ps = findPlaySession(s, playSessionId);
  if (!ps) throw new Error("Sesión jugada no encontrada");

  if (proposal.summary.trim()) {
    ps.summary = proposal.summary.trim();
  }

  const now = new Date().toISOString();
  for (const entry of proposal.wikiEntries) {
    s.wiki.push({
      id: crypto.randomUUID(),
      type: entry.type,
      title: entry.title,
      body: entry.body,
      masterOnly: entry.masterOnly ?? false,
      createdAt: now,
    });
  }

  for (const note of proposal.characterNotes) {
    const nameLower = note.playerOrCharacterName.toLowerCase();
    const participant = s.participants.find((p) => {
      if (p.role !== "player") return false;
      if (p.name.toLowerCase() === nameLower) return true;
      const sheet = s.characters.find((c) => c.participantId === p.id);
      return sheet?.characterName.toLowerCase() === nameLower;
    });

    if (participant) {
      const sheet = ensureCharacter(s, participant);
      if (note.bioAddition) {
        sheet.bio = sheet.bio
          ? `${sheet.bio}\n\n${note.bioAddition}`
          : note.bioAddition;
      }
      if (note.privateNotes) {
        sheet.privateNotes = sheet.privateNotes
          ? `${sheet.privateNotes}\n\n${note.privateNotes}`
          : note.privateNotes;
      }
      continue;
    }

    s.wiki.push({
      id: crypto.randomUUID(),
      type: "note",
      title: `Personaje: ${note.playerOrCharacterName}`,
      body: [note.bioAddition, note.privateNotes].filter(Boolean).join("\n"),
      masterOnly: true,
      createdAt: now,
    });
  }

  ps.aiProposal = { ...proposal, appliedAt: new Date().toISOString() };
  ps.transcriptStatus = "done";
}
