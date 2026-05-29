export type Role = "master" | "player" | "observer";

export type CampaignVisibility = "public" | "unlisted" | "private";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export type WikiEntryType = "location" | "item" | "npc" | "note";

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connectedAt: string;
  connected?: boolean;
  userId?: string;
  isOwner?: boolean;
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

export interface PendingJoinRequest {
  id: string;
  name: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  resolvedAt?: string;
  participantId?: string;
}

export interface SessionListItem {
  id: string;
  code: string;
  campaignTitle: string;
  createdAt: string;
  participantCount: number;
  connectedCount: number;
  pendingPlayerRequests: number;
  visibility: CampaignVisibility;
  isOwner?: boolean;
  myRole?: Role;
}

export interface SessionSnapshot {
  id: string;
  code: string;
  createdAt: string;
  campaignTitle?: string;
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
  pending?: boolean;
  requestId?: string;
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
  pendingJoinRequests?: PendingJoinRequest[];
  isOwner?: boolean;
  campaignVisibility?: CampaignVisibility;
}

export const VISIBILITY_LABELS: Record<CampaignVisibility, string> = {
  public: "Pública — aparece en explorar",
  unlisted: "Sin listar — solo con código o enlace",
  private: "Privada — solo miembros",
};

export interface HubMasterPatch {
  campaignTitle?: string;
  campaignSummary?: string;
  campaignAudioUrl?: string;
  visibility?: CampaignVisibility;
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
  player: "Requiere aprobación del master. Luego edita solo su personaje.",
  observer: "Escucha y lee resúmenes publicados.",
};

export const WIKI_TYPE_LABELS: Record<WikiEntryType, string> = {
  location: "Lugar",
  item: "Objeto",
  npc: "NPC",
  note: "Nota",
};
