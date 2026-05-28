import cors from "cors";
import express from "express";
import {
  createSessionData,
  joinSessionData,
  leaveSessionData,
  toSnapshot,
} from "./lib/sessions.js";
import type { JoinRequest } from "./lib/types.js";
import {
  deleteSessionIfEmpty,
  getSessionByCode,
  initStore,
  saveSession,
  usingMongo,
} from "./store.js";
import { isMongoConfigured, pingDb } from "../../lib/db/client.js";

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

app.get("/health", async (_req, res) => {
  const mongo = isMongoConfigured();
  let dbOk = false;
  if (mongo) {
    try {
      dbOk = await pingDb();
    } catch {
      dbOk = false;
    }
  }
  res.json({
    ok: true,
    mongo: mongo ? (dbOk ? "connected" : "error") : "not_configured",
  });
});

app.post("/api/sessions", async (_req, res) => {
  try {
    let session = createSessionData();
    while (await getSessionByCode(session.code)) {
      session = createSessionData();
    }
    await saveSession(session);
    res.status(201).json(toSnapshot(session));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la partida" });
  }
});

app.get("/api/sessions/:code", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ error: "Partida no encontrada" });
      return;
    }
    res.json(toSnapshot(session));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la partida" });
  }
});

app.post("/api/sessions/:code/join", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }

    const result = joinSessionData(session, req.body as JoinRequest);
    if (result.ok) await saveSession(session);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error al unirse" });
  }
});

app.post("/api/sessions/:code/leave", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
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
    await deleteSessionIfEmpty(session);
    if (session.participants.length > 0) {
      await saveSession(session);
      res.json(toSnapshot(session));
    } else {
      res.json({ ok: true, removed: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al salir" });
  }
});

async function start() {
  try {
    await initStore();
    app.listen(PORT, HOST, () => {
      const mode = usingMongo() ? "MongoDB" : "memoria";
      console.log(`Servidor Niku (${mode}) en http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar el servidor:", err);
    process.exit(1);
  }
}

start();
