import { io, type Socket } from "socket.io-client";
import type { Role, SessionSnapshot } from "./types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export interface JoinResponse {
  ok: boolean;
  error?: string;
  session?: SessionSnapshot;
  you?: { participantId: string; role: Role };
}

export function joinSession(
  payload: { sessionId?: string; code?: string; name: string; role: Role }
): Promise<JoinResponse> {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return new Promise((resolve) => {
    s.emit("session:join", payload, (response: JoinResponse) => {
      resolve(response);
    });
  });
}
