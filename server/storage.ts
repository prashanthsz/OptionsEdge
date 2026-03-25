import { db } from "./db";
import { watchlists, alerts, type InsertWatchlist, type Watchlist, type InsertAlert, type Alert } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getWatchlist(userId: string): Promise<Watchlist[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(id: number, userId: string): Promise<void>;
  getAlerts(userId: string): Promise<Alert[]>;
  getAlertForSymbol(userId: string, symbol: string): Promise<Alert | undefined>;
  upsertAlert(alert: InsertAlert): Promise<Alert>;
  deleteAlert(id: number, userId: string): Promise<void>;
}

class DatabaseStorage implements IStorage {
  async getWatchlist(userId: string): Promise<Watchlist[]> {
    return db.select().from(watchlists).where(eq(watchlists.userId, userId));
  }

  async addToWatchlist(item: InsertWatchlist): Promise<Watchlist> {
    const [result] = await db.insert(watchlists).values(item).returning();
    return result;
  }

  async removeFromWatchlist(id: number, userId: string): Promise<void> {
    await db.delete(watchlists).where(and(eq(watchlists.id, id), eq(watchlists.userId, userId)));
  }

  async getAlerts(userId: string): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.userId, userId));
  }

  async getAlertForSymbol(userId: string, symbol: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.symbol, symbol)));
    return alert;
  }

  async upsertAlert(alert: InsertAlert): Promise<Alert> {
    const existing = await this.getAlertForSymbol(alert.userId, alert.symbol);
    if (existing) {
      const [updated] = await db.update(alerts).set(alert).where(eq(alerts.id, existing.id)).returning();
      return updated;
    }
    const [result] = await db.insert(alerts).values(alert).returning();
    return result;
  }

  async deleteAlert(id: number, userId: string): Promise<void> {
    await db.delete(alerts).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
