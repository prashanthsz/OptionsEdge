import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export { users, sessions } from "./models/auth";
export type { User, UpsertUser } from "./models/auth";

export const watchlists = pgTable("watchlists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }),
  addedAt: timestamp("added_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  ivThreshold: real("iv_threshold"),
  volumeThreshold: integer("volume_threshold"),
  telegramEnabled: boolean("telegram_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlists).omit({ id: true, addedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof watchlists.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
