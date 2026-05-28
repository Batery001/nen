"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.getSessionByCode = getSessionByCode;
exports.deleteSessionById = deleteSessionById;
exports.ensureIndexes = ensureIndexes;
const client_js_1 = require("./client.js");
const COLLECTION = "sessions";
async function saveSession(session) {
    const db = await (0, client_js_1.getDb)();
    const col = db.collection(COLLECTION);
    await col.updateOne({ id: session.id }, { $set: session }, { upsert: true });
}
async function getSessionByCode(code) {
    const db = await (0, client_js_1.getDb)();
    const normalized = code.toUpperCase().trim();
    const doc = await db.collection(COLLECTION).findOne({ code: normalized });
    return doc ?? undefined;
}
async function deleteSessionById(id) {
    const db = await (0, client_js_1.getDb)();
    await db.collection(COLLECTION).deleteOne({ id });
}
async function ensureIndexes() {
    const db = await (0, client_js_1.getDb)();
    await db.collection(COLLECTION).createIndex({ code: 1 }, { unique: true });
    await db.collection(COLLECTION).createIndex({ id: 1 }, { unique: true });
}
