import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

const globalCache = globalThis as unknown as {
  _nikuMongoClient?: MongoClient;
};

export function isMongoConfigured(): boolean {
  return Boolean(uri?.trim());
}

export async function getDb(): Promise<Db> {
  if (!uri?.trim()) {
    throw new Error("MONGODB_URI no está configurada");
  }

  if (!globalCache._nikuMongoClient) {
    globalCache._nikuMongoClient = new MongoClient(uri);
    await globalCache._nikuMongoClient.connect();
  }

  return globalCache._nikuMongoClient.db(process.env.MONGODB_DB_NAME ?? "niku");
}

export async function pingDb(): Promise<boolean> {
  if (!isMongoConfigured()) return false;
  const db = await getDb();
  await db.command({ ping: 1 });
  return true;
}
