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
