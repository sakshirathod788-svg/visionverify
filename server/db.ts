import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { analyses, type Analysis, type InsertAnalysis, type InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createAnalysis(values: InsertAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(analyses).values(values);
  return Number((result as unknown as { insertId: number }).insertId);
}

export async function listAnalysesByUserId(userId: number, limit = 100): Promise<Analysis[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}

export async function getAnalysisByIdForUser(id: number, userId: number): Promise<Analysis | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
    .limit(1);
  return result[0];
}
