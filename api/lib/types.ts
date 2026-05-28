export type Role = "master" | "player" | "observer";

export type CampaignVisibility = "public" | "unlisted" | "private";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthCode {
  email: string;
  code: string;
  expiresAt: string;
  displayName?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  expiresAt: string;
}

export type WikiEntryType = "location" | "item" | "npc" | "note";

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connectedAt: string;
  connected?: boolean;
  disconnectedAt?: string;
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
  /** Solo visible para el master */
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
  userId?: string;
}

export interface GameSession {
  id: string;
  code: string;
  createdAt: string;
  participants: Participant[];
  campaignTitle: string;
  campaignSummary: string;
  campaignAudioUrl: string;
  wiki: WikiEntry[];
  characters: CharacterSheet[];
  playSessions: PlaySessionRecord[];
  pendingJoinRequests?: PendingJoinRequest[];
  ownerUserId?: string;
  visibility?: CampaignVisibility;
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
  participants: Participant[];
  rolesAvailable: {
    master: boolean;
    player: boolean;
    observer: boolean;
  };
}

export interface JoinRequest {
  name: string;
  role: Role;
  sessionId?: string;
  userId?: string;
}

export interface JoinResponse {
  ok: boolean;
  error?: string;
  session?: SessionSnapshot;
  you?: { participantId: string; role: Role };
  /** Solicitud de jugador enviada, pendiente de aprobación del master */
  pending?: boolean;
  requestId?: string;
}

/** Vista del hub filtrada por permisos */
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
