import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertWatchlistSchema, insertAlertSchema } from "@shared/schema";
import { getQuote, getIntradayPrices, getHistoricalPrices } from "./market-data";
import * as publicApi from "./public-api";
import { runWheelBacktest } from "./wheel-backtest";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/watchlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getWatchlist(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertWatchlistSchema.parse({ ...req.body, userId });
      const item = await storage.addToWatchlist(data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid watchlist data" });
    }
  });

  app.delete("/api/watchlist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromWatchlist(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getAlerts(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertAlertSchema.parse({ ...req.body, userId });
      const alert = await storage.upsertAlert(data);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.delete("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAlert(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  app.get("/api/market/quote/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();

      let publicQuote = null;
      if (publicApi.isConfigured()) {
        try {
          publicQuote = await publicApi.getStockQuote(symbol);
        } catch (e) {
          console.error("[routes] Public.com quote fallback:", e);
        }
      }

      const yahooQuote = await getQuote(symbol);
      if (!yahooQuote && !publicQuote) {
        return res.status(404).json({ message: `No data found for ${symbol}` });
      }

      const merged: any = { ...(yahooQuote || {}) };
      if (publicQuote) {
        merged.price = publicQuote.price || merged.price;
        merged.bid = publicQuote.bid;
        merged.ask = publicQuote.ask;
        merged.bidSize = publicQuote.bidSize;
        merged.askSize = publicQuote.askSize;
        merged.name = publicQuote.name || merged.name;
        merged.source = "public.com";
      } else {
        merged.source = "yahoo";
      }
      res.json(merged);
    } catch (error) {
      console.error("[routes] quote error:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.get("/api/market/intraday/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const prices = await getIntradayPrices(symbol);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intraday data" });
    }
  });

  app.get("/api/market/historical/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const range = (req.query.range as string) || "1y";
      const prices = await getHistoricalPrices(symbol, range);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  app.get("/api/market/backtest/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const years = parseInt(req.query.years as string) || 1;
      const premiumPct = parseFloat(req.query.premiumPct as string) || 1.0;
      const expiryWeeks = parseInt(req.query.expiryWeeks as string) || 3;
      const result = await runWheelBacktest(symbol, years, premiumPct, expiryWeeks);
      res.json(result);
    } catch (error) {
      console.error("[routes] backtest error:", error);
      res.status(500).json({ message: "Failed to run backtest" });
    }
  });

  app.get("/api/market/options/expirations/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      if (!publicApi.isConfigured()) {
        return res.json({ expirations: [], source: "mock" });
      }
      const expirations = await publicApi.getOptionExpirations(symbol);
      res.json({ expirations, source: "public.com" });
    } catch (error) {
      console.error("[routes] expirations error:", error);
      res.json({ expirations: [], source: "error" });
    }
  });

  app.get("/api/market/options/chain/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const expiration = req.query.expiration as string;
      if (!publicApi.isConfigured() || !expiration) {
        return res.json({ calls: [], puts: [], source: "mock" });
      }
      const chain = await publicApi.getOptionChain(symbol, expiration);
      res.json({ ...chain, source: "public.com" });
    } catch (error) {
      console.error("[routes] option chain error:", error);
      res.json({ calls: [], puts: [], source: "error" });
    }
  });

  app.get("/api/market/portfolio", async (req, res) => {
    try {
      if (!publicApi.isConfigured()) {
        return res.json({ positions: [], source: "mock" });
      }
      const portfolio = await publicApi.getPortfolio();
      res.json({ ...portfolio, source: "public.com" });
    } catch (error) {
      console.error("[routes] portfolio error:", error);
      res.json({ positions: [], source: "error" });
    }
  });

  app.get("/api/market/account", async (req, res) => {
    try {
      if (!publicApi.isConfigured()) {
        return res.json({ accounts: [], source: "mock" });
      }
      const account = await publicApi.getAccountInfo();
      res.json({ ...account, source: "public.com" });
    } catch (error) {
      console.error("[routes] account error:", error);
      res.json({ accounts: [], source: "error" });
    }
  });

  return httpServer;
}

function formatVol(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toString();
}
