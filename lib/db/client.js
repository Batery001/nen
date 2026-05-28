"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMongoConfigured = isMongoConfigured;
exports.getDb = getDb;
exports.pingDb = pingDb;
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
const globalCache = globalThis;
function isMongoConfigured() {
    return Boolean(uri?.trim());
}
async function getDb() {
    if (!uri?.trim()) {
        throw new Error("MONGODB_URI no está configurada");
    }
    if (!globalCache._nikuMongoClient) {
        globalCache._nikuMongoClient = new mongodb_1.MongoClient(uri);
        await globalCache._nikuMongoClient.connect();
    }
    return globalCache._nikuMongoClient.db(process.env.MONGODB_DB_NAME ?? "niku");
}
async function pingDb() {
    if (!isMongoConfigured())
        return false;
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
}
