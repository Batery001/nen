import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const BASE = process.env.TEST_API_URL ?? "http://127.0.0.1:3001";
const headers = { "Content-Type": "application/json" };

async function json(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

describe("flujo campaña", () => {
  let code;
  let masterId;
  let sessionId;
  let requestId;

  before(async () => {
    const health = await fetch(`${BASE}/api/health`);
    if (!health.ok) {
      throw new Error(`Servidor no disponible en ${BASE}. Ejecuta: npm run start --prefix server`);
    }
  });

  it("crea campaña como master", async () => {
    const { res, body } = await json("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name: "Test Master", role: "master" }),
    });
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.session?.code);
    assert.ok(body.you?.participantId);
    code = body.session.code;
    masterId = body.you.participantId;
    sessionId = body.session.id;
  });

  it("master sale (desconecta)", async () => {
    const { res, body } = await json(`/api/sessions/${code}/leave`, {
      method: "POST",
      body: JSON.stringify({ participantId: masterId }),
    });
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
  });

  it("master reingresa", async () => {
    const { res, body } = await json(`/api/sessions`, {
      method: "POST",
      body: JSON.stringify({ name: "Test Master", role: "master" }),
    });
    assert.equal(res.status, 200);
    const created = body.session?.code;
    assert.ok(created);
    const join = await json(`/api/sessions/${created}/join`, {
      method: "POST",
      body: JSON.stringify({ name: "Test Master 2", role: "master" }),
    });
    assert.equal(join.body.ok, true);
  });

  it("jugador solicita entrada", async () => {
    const { res, body } = await json(`/api/sessions/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ name: "Jugador Test", role: "player", sessionId }),
    });
    assert.equal(res.status, 200);
    assert.equal(body.pending, true);
    assert.ok(body.requestId);
    requestId = body.requestId;
  });

  it("master aprueba jugador", async () => {
    const { res, body } = await json(`/api/sessions/${code}/join-requests/${requestId}`, {
      method: "POST",
      body: JSON.stringify({ participantId: masterId, action: "approve" }),
    });
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
  });

  it("enlace invitación resuelve código", async () => {
    const { res, body } = await json(`/api/sessions/${code}`);
    assert.equal(res.status, 200);
    assert.equal(body.code, code);
  });
});
