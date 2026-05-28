export type Role = "master" | "player" | "observer";

export type WikiEntryType = "location" | "item" | "npc" | "note";

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connectedAt: string;
}

export interface CharacterSheet {
  participantId: string;
  playerName: string;
  characterName: string;
  bio: string;
  privateNotes: string;
}

export interface WikiEntry {
  id: string;
  type: WikiEntryType;
  title: string;
  body: string;
  masterOnly: boolean;
}

export interface PlaySessionRecord {
  id: string;
  title: string;
  summary: string;
  audioUrl: string;
  playedAt: string;
  published: boolean;
}

export interface SessionSnapshot {
  id: string;
  code: string;
  createdAt: string;
  participants: Participant[];
  rolesAvailable: {
    master: boolean;
    player: boolean;
    observer: boolean;
  };
}

export interface JoinResponse {
  ok: boolean;
  error?: string;
  session?: SessionSnapshot;
  you?: { participantId: string; role: Role };
}

export interface HubView {
  code: string;
  role: Role;
  participantId: string;
  campaignTitle: string;
  campaignSummary: string;
  campaignAudioUrl: string;
  participants?: Participant[];
  wiki?: WikiEntry[];
  playSessions?: PlaySessionRecord[];
  myCharacter?: CharacterSheet;
  characters?: CharacterSheet[];
}

export interface HubMasterPatch {
  campaignTitle?: string;
  campaignSummary?: string;
  campaignAudioUrl?: string;
  wiki?: WikiEntry[];
  playSessions?: PlaySessionRecord[];
}

export interface CharacterPatch {
  characterName?: string;
  bio?: string;
  privateNotes?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  master: "Master",
  player: "Jugador",
  observer: "Observador",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  master: "Dirige la campaña y edita todo el hub.",
  player: "Edita solo su personaje; lee lo publicado.",
  observer: "Escucha y lee resúmenes publicados.",
};

export const WIKI_TYPE_LABELS: Record<WikiEntryType, string> = {
  location: "Lugar",
  item: "Objeto",
  npc: "NPC",
  note: "Nota",
};
