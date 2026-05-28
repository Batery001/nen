export type Role = "master" | "player" | "observer";

export interface Participant {
  id: string;
  socketId: string;
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
  participants: Omit<Participant, "socketId">[];
  rolesAvailable: {
    master: boolean;
    player: boolean;
    observer: boolean;
  };
}
