import type {
  CharacterPatch,
  CharacterSheet,
  GameSession,
  HubMasterPatch,
  HubView,
  Participant,
} from "./types.js";
import { ensureHubFields } from "./migrate.js";
import { ensurePendingRequests } from "./joinRequests.js";
import {
  canAccessHub as membershipCanAccess,
  canManageCampaign,
  findParticipantById,
} from "./membership.js";

export function findParticipant(
  session: GameSession,
  participantId: string
): Participant | undefined {
  return findParticipantById(session, participantId);
}

export function ensureCharacter(
  session: GameSession,
  participant: Participant
): CharacterSheet {
  let sheet = session.characters.find((c) => c.participantId === participant.id);
  if (!sheet) {
    sheet = {
      participantId: participant.id,
      playerName: participant.name,
      characterName: participant.role === "player" ? participant.name : "",
      bio: "",
      privateNotes: "",
    };
    session.characters.push(sheet);
  }
  sheet.playerName = participant.name;
  return sheet;
}

export function buildHubView(
  session: GameSession,
  participantId: string,
  userId?: string
): HubView | null {
  const s = ensureHubFields(session);
  const me = findParticipant(s, participantId);
  if (!me || !membershipCanAccess(s, participantId, userId)) return null;

  const base: HubView = {
    code: s.code,
    role: me.role,
    participantId: me.id,
    campaignTitle: s.campaignTitle,
    campaignSummary: s.campaignSummary,
    campaignAudioUrl: s.campaignAudioUrl,
    isOwner: Boolean(userId && s.ownerUserId === userId),
    campaignVisibility: s.visibility ?? "public",
  };

  if (me.role === "master") {
    return {
      ...base,
      participants: s.participants.map((p) => ({ ...p })),
      wiki: [...s.wiki],
      playSessions: [...s.playSessions],
      characters: [...s.characters],
      pendingJoinRequests: ensurePendingRequests(s).filter((r) => r.status === "pending"),
    };
  }

  if (me.role === "player") {
    const myCharacter = ensureCharacter(s, me);
    return {
      ...base,
      myCharacter: { ...myCharacter },
      wiki: s.wiki.filter((w) => !w.masterOnly),
      playSessions: s.playSessions.filter((p) => p.published),
    };
  }

  return {
    ...base,
    campaignSummary: s.campaignSummary || "Aún no hay resumen publicado.",
    playSessions: s.playSessions
      .filter((p) => p.published)
      .map((p) => ({ ...p, summary: p.summary || "Sin resumen escrito." })),
  };
}

export function applyMasterPatch(session: GameSession, patch: HubMasterPatch): void {
  ensureHubFields(session);
  if (patch.campaignTitle !== undefined) session.campaignTitle = patch.campaignTitle;
  if (patch.campaignSummary !== undefined) session.campaignSummary = patch.campaignSummary;
  if (patch.campaignAudioUrl !== undefined) session.campaignAudioUrl = patch.campaignAudioUrl;
  if (patch.wiki !== undefined) session.wiki = patch.wiki;
  if (patch.playSessions !== undefined) session.playSessions = patch.playSessions;
  if (patch.visibility !== undefined) session.visibility = patch.visibility;
}

export function applyCharacterPatch(
  session: GameSession,
  actorId: string,
  targetParticipantId: string,
  patch: CharacterPatch
): { ok: boolean; error?: string; character?: CharacterSheet } {
  const s = ensureHubFields(session);
  const actor = findParticipant(s, actorId);
  if (!actor) return { ok: false, error: "No autorizado" };

  const target = findParticipant(s, targetParticipantId);
  if (!target) return { ok: false, error: "Personaje no encontrado" };

  if (actor.role === "player" && actor.id !== targetParticipantId) {
    return { ok: false, error: "Solo puedes editar tu personaje" };
  }
  if (actor.role === "observer") {
    return { ok: false, error: "Los observadores no pueden editar" };
  }

  const sheet = ensureCharacter(s, target);
  if (patch.characterName !== undefined) sheet.characterName = patch.characterName;
  if (patch.bio !== undefined) sheet.bio = patch.bio;
  if (patch.privateNotes !== undefined) sheet.privateNotes = patch.privateNotes;

  return { ok: true, character: sheet };
}

export function requireMaster(
  session: GameSession,
  participantId: string | undefined,
  userId?: string
): boolean {
  return canManageCampaign(session, participantId, userId);
}
