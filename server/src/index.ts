import cors from "cors";
import express from "express";
import { requestLoginCode, revokeToken, verifyLoginCode } from "../../api/lib/auth.js";
import {
  applyCharacterPatch,
  applyMasterPatch,
  buildHubView,
  requireMaster,
} from "../../api/lib/hub.js";
import {
  getJoinRequestStatus,
  resolveJoinRequest,
} from "../../api/lib/joinRequests.js";
import { campaignShouldPersist, ensureOwnerParticipant, reconnectParticipant } from "../../api/lib/membership.js";
import { ensureHubFields } from "../../api/lib/migrate.js";
import { getUserFromAuthHeader } from "../../api/lib/requestAuth.js";
import {
  createSessionData,
  joinSessionData,
  leaveSessionData,
  rejoinCampaign,
  toSnapshot,
} from "../../api/lib/sessions.js";
import type { CharacterPatch, HubMasterPatch, JoinRequest } from "../../api/lib/types.js";
import {
  deleteSessionIfEmpty,
  getSessionByCode,
  initStore,
  listSessionItems,
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

app.post("/api/auth/request-code", async (req, res) => {
  const { email, displayName } = req.body as { email?: string; displayName?: string };
  if (!email?.trim()) {
    res.status(400).json({ ok: false, error: "Email requerido" });
    return;
  }
  const result = await requestLoginCode(email, displayName?.trim());
  res.status(result.ok ? 200 : 400).json({
    ok: result.ok,
    error: result.error,
    devCode: result.devCode,
    message: "Revisa tu email para el código de acceso",
  });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email?.trim() || !code?.trim()) {
    res.status(400).json({ ok: false, error: "Email y código requeridos" });
    return;
  }
  const result = await verifyLoginCode(email, code);
  res.status(result.ok ? 200 : 400).json(result);
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ ok: false, error: "No autenticado" });
    return;
  }
  res.json({ ok: true, user });
});

app.post("/api/auth/logout", async (req, res) => {
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) await revokeToken(token);
  res.json({ ok: true });
});

app.get("/api/campaigns/mine", async (req, res) => {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ ok: false, error: "Inicia sesión" });
    return;
  }
  const sessions = await listSessionItems({ memberUserId: user.id });
  res.json({ sessions });
});

app.get("/api/sessions", async (_req, res) => {
  try {
    const sessions = await listSessionItems({ visibility: "public" });
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al listar mesas" });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(req.headers.authorization);
    const body = req.body as JoinRequest;
    const name = body?.name?.trim();

    if (name) {
      if (!user) {
        res.status(401).json({ ok: false, error: "Inicia sesión para crear una campaña" });
        return;
      }
      let session = createSessionData(user.id);
      while (await getSessionByCode(session.code)) {
        session = createSessionData(user.id);
      }
      const participant = ensureOwnerParticipant(session, user.id, name);
      await saveSession(session);
      res.status(201).json({
        ok: true,
        session: toSnapshot(session),
        you: { participantId: participant.id, role: "master" as const },
      });
      return;
    }

    let session = createSessionData(user?.id);
    while (await getSessionByCode(session.code)) {
      session = createSessionData(user?.id);
    }
    await saveSession(session);
    res.status(201).json(toSnapshot(session));
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Error al crear la partida";
    res.status(500).json({ ok: false, error: message });
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

app.post("/api/sessions/:code/rejoin", async (req, res) => {
  try {
    const user = await getUserFromAuthHeader(req.headers.authorization);
    if (!user) {
      res.status(401).json({ ok: false, error: "Inicia sesión para reingresar" });
      return;
    }
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    const result = rejoinCampaign(session, user.id, user.displayName);
    if (!result.ok) {
      res.status(403).json(result);
      return;
    }
    const me = session.participants.find((p) => p.id === result.you?.participantId);
    if (me) reconnectParticipant(me);
    await saveSession(session);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error al reingresar" });
  }
});

app.post("/api/sessions/:code/join", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    const user = await getUserFromAuthHeader(req.headers.authorization);
    const body = req.body as JoinRequest;
    const result = joinSessionData(session, { ...body, userId: body.userId ?? user?.id });
    if (result.ok && (result.you || result.pending)) await saveSession(session);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error al unirse" });
  }
});

app.get("/api/sessions/:code/join-requests/:requestId", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    const result = getJoinRequestStatus(session, req.params.requestId);
    res.status(result.ok ? 200 : 404).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error" });
  }
});

app.post("/api/sessions/:code/join-requests/:requestId", async (req, res) => {
  try {
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ ok: false, error: "Partida no encontrada" });
      return;
    }
    const user = await getUserFromAuthHeader(req.headers.authorization);
    const { action, participantId } = req.body as {
      action?: "approve" | "reject";
      participantId?: string;
    };
    if (!participantId || !action) {
      res.status(400).json({ error: "participantId y action requeridos" });
      return;
    }
    if (!requireMaster(session, participantId, user?.id)) {
      res.status(403).json({ ok: false, error: "Solo el master puede gestionar solicitudes" });
      return;
    }
    const result = resolveJoinRequest(session, req.params.requestId, action);
    if (result.ok) await saveSession(session);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error" });
  }
});

app.get("/api/sessions/:code/hub", async (req, res) => {
  try {
    const participantId = req.query.participantId as string;
    if (!participantId) {
      res.status(400).json({ error: "participantId requerido" });
      return;
    }
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ error: "Partida no encontrada" });
      return;
    }
    const user = await getUserFromAuthHeader(req.headers.authorization);
    const me = session.participants.find((p) => p.id === participantId);
    if (me) {
      reconnectParticipant(me);
      await saveSession(session);
    }
    const hub = buildHubView(ensureHubFields(session), participantId, user?.id);
    if (!hub) {
      res.status(403).json({ error: "No estás en esta mesa" });
      return;
    }
    res.json(hub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar el hub" });
  }
});

app.patch("/api/sessions/:code/hub", async (req, res) => {
  try {
    const participantId = req.query.participantId as string;
    if (!participantId) {
      res.status(400).json({ error: "participantId requerido" });
      return;
    }
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ error: "Partida no encontrada" });
      return;
    }
    const user = await getUserFromAuthHeader(req.headers.authorization);
    if (!requireMaster(session, participantId, user?.id)) {
      res.status(403).json({ error: "Solo el master puede editar la campaña" });
      return;
    }
    applyMasterPatch(ensureHubFields(session), req.body as HubMasterPatch);
    await saveSession(session);
    res.json(buildHubView(session, participantId, user?.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar" });
  }
});

app.put("/api/sessions/:code/hub/character", async (req, res) => {
  try {
    const participantId = req.query.participantId as string;
    const { targetParticipantId, patch } = req.body as {
      targetParticipantId?: string;
      patch?: CharacterPatch;
    };
    if (!participantId) {
      res.status(400).json({ error: "participantId requerido" });
      return;
    }
    const session = await getSessionByCode(req.params.code);
    if (!session) {
      res.status(404).json({ error: "Partida no encontrada" });
      return;
    }
    const user = await getUserFromAuthHeader(req.headers.authorization);
    const result = applyCharacterPatch(
      ensureHubFields(session),
      participantId,
      targetParticipantId ?? participantId,
      patch ?? {}
    );
    if (!result.ok) {
      res.status(403).json({ error: result.error });
      return;
    }
    await saveSession(session);
    res.json(buildHubView(session, participantId, user?.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar personaje" });
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
    await saveSession(session);
    if (!campaignShouldPersist(session) && session.participants.length === 0) {
      await deleteSessionIfEmpty(session);
      res.json({ ok: true, removed: true, disconnected: true });
      return;
    }
    res.json({ ok: true, disconnected: true, session: toSnapshot(session) });
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
