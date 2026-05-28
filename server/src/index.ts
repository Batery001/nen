import cors from "cors";
import express from "express";
import {
  createSessionData,
  joinSessionData,
  leaveSessionData,
  toSnapshot,
} from "./lib/sessions.js";
import type { JoinRequest } from "./lib/types.js";
import { deleteSessionIfEmpty, getSessionByCode, saveSession } from "./store.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST ?? "0.0.0.0";

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".vercel.app") || host === "vercel.app") return true;
  } catch {
    /* ignore */
  }
  return false;
}

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/sessions", (_req, res) => {
  let session = createSessionData();
  while (getSessionByCode(session.code)) {
    session = createSessionData();
  }
  saveSession(session);
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

app.post("/api/sessions/:code/join", (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) {
    res.status(404).json({ ok: false, error: "Partida no encontrada" });
    return;
  }

  const result = joinSessionData(session, req.body as JoinRequest);
  if (result.ok) saveSession(session);
  res.status(result.ok ? 200 : 400).json(result);
});

app.post("/api/sessions/:code/leave", (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const { participantId } = req.body as { participantId?: string };
  if (!participantId) {
    res.status(400).json({ error: "participantId requerido" });
    return;
  }

  leaveSessionData(session, participantId);
  deleteSessionIfEmpty(session);
  if (session.participants.length > 0) {
    saveSession(session);
    res.json(toSnapshot(session));
  } else {
    res.json({ ok: true, removed: true });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor Nen en http://${HOST}:${PORT}`);
});
