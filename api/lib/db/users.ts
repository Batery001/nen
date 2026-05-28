import type { AuthCode, AuthSession, User } from "../types.js";
import { getDb } from "./client.js";

const USERS = "users";
const AUTH_CODES = "auth_codes";
const AUTH_SESSIONS = "auth_sessions";

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  const doc = await db.collection<User>(USERS).findOne({ email });
  return doc ?? undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  const doc = await db.collection<User>(USERS).findOne({ id });
  return doc ?? undefined;
}

export async function upsertUser(user: User): Promise<void> {
  const db = await getDb();
  await db.collection<User>(USERS).updateOne({ id: user.id }, { $set: user }, { upsert: true });
}

export async function saveAuthCode(record: AuthCode): Promise<void> {
  const db = await getDb();
  await db.collection<AuthCode>(AUTH_CODES).updateOne(
    { email: record.email },
    { $set: record },
    { upsert: true }
  );
}

export async function getAuthCode(email: string): Promise<AuthCode | undefined> {
  const db = await getDb();
  const doc = await db.collection<AuthCode>(AUTH_CODES).findOne({ email });
  return doc ?? undefined;
}

export async function deleteAuthCode(email: string): Promise<void> {
  const db = await getDb();
  await db.collection(AUTH_CODES).deleteOne({ email });
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  const db = await getDb();
  await db.collection<AuthSession>(AUTH_SESSIONS).updateOne(
    { token: session.token },
    { $set: session },
    { upsert: true }
  );
}

export async function findAuthSessionByToken(token: string): Promise<AuthSession | undefined> {
  const db = await getDb();
  const doc = await db.collection<AuthSession>(AUTH_SESSIONS).findOne({ token });
  return doc ?? undefined;
}

export async function deleteAuthSession(token: string): Promise<void> {
  const db = await getDb();
  await db.collection(AUTH_SESSIONS).deleteOne({ token });
}
