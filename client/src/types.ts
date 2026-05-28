export type Role = "master" | "player" | "observer";

export interface Participant {
  id: string;
  name: string;
  role: Role;
  connectedAt: string;
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

export const ROLE_LABELS: Record<Role, string> = {
  master: "Master",
  player: "Jugador",
  observer: "Observador",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  master: "Dirige la partida, controla el mundo y los NPC.",
  player: "Participa con un personaje en la aventura.",
  observer: "Sigue la partida sin intervenir (ideal para espectadores).",
};
