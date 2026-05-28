import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  addParticipant,
  createSession,
  findSessionBySocket,
  getSessionByCode,
  getSessionById,
  removeParticipantBySocket,
  toSnapshot,
} from "./sessions.js";
import type { Role } from "./types.js";

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/sessions", (_req, res) => {
  const session = createSession();
  res.status(201).json(toSnapshot(session));
});

app.get("/api/sessions/:code", (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  res.json(toSnapshot(session));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  socket.on(
    "session:join",
    (
      payload: { sessionId?: string; code?: string; name: string; role: Role },
      callback?: (response: unknown) => void
    ) => {
      const respond = (data: unknown) => {
        if (typeof callback === "function") callback(data);
      };

      const name = payload.name?.trim();
      if (!name || name.length < 2) {
        respond({ ok: false, error: "El nombre debe tener al menos 2 caracteres" });
        return;
      }

      const session =
        (payload.sessionId && getSessionById(payload.sessionId)) ||
        (payload.code && getSessionByCode(payload.code));

      if (!session) {
        respond({ ok: false, error: "Partida no encontrada" });
        return;
      }

      const participant = {
        id: crypto.randomUUID(),
        socketId: socket.id,
        name,
        role: payload.role,
        connectedAt: new Date().toISOString(),
      };

      const snapshot = addParticipant(session.id, participant);
      if (!snapshot) {
        const reason =
          payload.role === "master"
            ? "Ya hay un master en esta partida"
            : "No se pudo unir a la partida";
        respond({ ok: false, error: reason });
        return;
      }

      socket.join(session.id);
      socket.data.sessionId = session.id;
      socket.data.participantId = participant.id;

      io.to(session.id).emit("session:updated", snapshot);
      respond({ ok: true, session: snapshot, you: { participantId: participant.id, role: payload.role } });
    }
  );

  socket.on("disconnect", () => {
    const snapshot = removeParticipantBySocket(socket.id);
    if (snapshot) {
      io.to(snapshot.id).emit("session:updated", snapshot);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor Nen en http://localhost:${PORT}`);
});
