import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core identity table maintained by the built-in authentication flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 700 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 32 }).notNull(),
  byteSize: int("byteSize").notNull(),
  imageWidth: int("imageWidth"),
  imageHeight: int("imageHeight"),
  status: mysqlEnum("status", ["completed", "unavailable", "failed"])
    .default("unavailable")
    .notNull(),
  prediction: mysqlEnum("prediction", [
    "likely_authentic",
    "suspicious",
    "likely_manipulated",
    "unable_to_analyze",
  ]),
  confidencePercent: int("confidencePercent"),
  manipulationProbabilityPercent: int("manipulationProbabilityPercent"),
  modelMode: mysqlEnum("modelMode", ["live", "demo", "offline"])
    .default("offline")
    .notNull(),
  modelName: varchar("modelName", { length: 255 }),
  modelVersion: varchar("modelVersion", { length: 128 }),
  analysisData: json("analysisData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;
