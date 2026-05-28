export type Role = "master" | "player" | "observer";

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connectedAt: string;
}

export interface GameSession {
  id: string;
  code: string;
  createdAt: string;
  participants: Participant[];
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
}

export interface JoinResponse {
  ok: boolean;
  error?: string;
  session?: SessionSnapshot;
  you?: { participantId: string; role: Role };
}
