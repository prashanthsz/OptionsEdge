# OptionsEdge

## Overview
OptionsEdge is a cross-platform stock options tracking and strategy platform with real-time market data, Greeks, AI-driven suggestions, and configurable alerts via Telegram and WhatsApp.

## Architecture
- **Frontend**: React + Vite + TypeScript with ShadCN/UI components
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (supports Google, GitHub, email login)
- **Routing**: wouter (client-side)
- **Market Data**: Yahoo Finance Chart API (v8) for live prices, with mock data fallback

## Key Files
- `client/src/pages/Login.tsx` - Auth login page (Replit Auth)
- `client/src/pages/Dashboard.tsx` - Main options dashboard with Greeks, charts, AI inference, alerts
- `client/src/pages/TickerDetail.tsx` - Individual ticker deep-dive page
- `client/src/App.tsx` - Routes: `/` (login), `/dashboard`, `/ticker/:symbol`
- `client/src/hooks/use-auth.ts` - Auth hook for user state
- `client/src/lib/api.ts` - Frontend API client for market data endpoints
- `client/src/lib/mock-data.ts` - Mock data generator for options chain, sentiment, AI, backtest
- `shared/schema.ts` - Drizzle schema (watchlists, alerts, re-exports auth models)
- `shared/models/auth.ts` - Auth schema (users, sessions)
- `server/routes.ts` - API routes (watchlist CRUD, alerts CRUD, market data proxy)
- `server/market-data.ts` - Yahoo Finance API integration with in-memory caching
- `server/storage.ts` - Database storage layer
- `server/db.ts` - Database connection
- `server/replit_integrations/auth/` - Replit Auth integration

## Market Data Architecture
- **Live data (Yahoo Finance)**: Real-time stock prices, intraday charts, historical data, 52-week range, volume
- **Live data (Public.com)**: Stock quotes with bid/ask, options expirations, full options chain (calls/puts with strike, bid, ask, last, sizes)
- **Mock data (generated)**: Greeks (delta, gamma, theta, vega — not available from Public.com), social sentiment, AI suggestions, backtest P&L, revenue
- **API Endpoints**: `/api/market/quote/:symbol`, `/api/market/intraday/:symbol`, `/api/market/historical/:symbol`, `/api/market/options/expirations/:symbol`, `/api/market/options/chain/:symbol?expiration=DATE`, `/api/market/portfolio`, `/api/market/account`
- **Data merge**: Quote route tries Public.com first (bid/ask), Yahoo Finance for chart data; both merged
- **Caching**: In-memory cache with 30s TTL for quotes, 60s for intraday, 5min for historical
- **Auto-refresh**: Frontend polls every 30 seconds for updated prices

## Design System
- Dark navy background with neon green (`142 100% 50%`) for positive trends
- Neon red (`0 100% 50%`) for negative trends
- Indigo/cyan accents for AI inference cards
- Fonts: Inter (sans) + JetBrains Mono (mono)

## Features
- Live stock prices from Yahoo Finance (any symbol)
- Options chain with Greeks (Delta, Gamma, Theta, Vega) - mock data
- Real-time intraday price charts
- AI Neural Suggestion engine (mock inference)
- Wheel Strategy simulator with 1-3 year backtest
- Watchlist management (per-user, persisted)
- Alert configuration (IV/Volume thresholds, Telegram/WhatsApp toggles)
- Revenue charts (quarterly/annual)
- Social sentiment feed (mock)
- LIVE/MOCK badge indicator showing data source
- Symbol search with instant load on dashboard

## Key Files (continued)
- `server/public-api.ts` - Public.com API integration (OAuth token exchange, options chain, portfolio)
- `server/wheel-backtest.ts` - Wheel Strategy backtester using real Yahoo Finance historical prices

## Data State
- Stock prices, intraday charts, 52-week range: LIVE from Yahoo Finance
- Stock quote bid/ask: LIVE from Public.com
- Options chain (strike, bid, ask, last): LIVE from Public.com with expiration date selector
- Greeks (delta, gamma, theta, vega): Mock estimates (not provided by Public.com API)
- Wheel Strategy backtest: LIVE using Yahoo Finance historical prices (1-3 years), simulates sell put/call cycles with real price movements
- Sentiment, AI suggestions: Mock
- Watchlists and alerts: Persisted in PostgreSQL
- Auth: Fully functional via Replit Auth
