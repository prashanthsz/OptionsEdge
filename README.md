# OptionsEdge

A comprehensive stock options tracker with real-time Greeks, IV, Wheel Strategy backtester, and AI trade suggestions.

## Features

- Live stock quotes (bid/ask) via Public.com API
- Real-time intraday charts via Yahoo Finance
- Options chain with 4 tabs: Call Sell / Call Buy / Put Sell / Put Buy (50 ATM strikes)
- Wheel Strategy backtester using 1–3 years of real historical prices
- Watchlists and configurable alerts (Telegram / WhatsApp)
- Dark neon UI with Greeks, IV, P/E, sentiment feed

## Running Locally (Mac / Linux)

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### 1. Install PostgreSQL (Mac)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb optionsedge
```

### 2. Clone and install

```bash
git clone https://github.com/prashanthsz/OptionsEdge.git
cd OptionsEdge
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://localhost/optionsedge
SESSION_SECRET=any-random-string-here
PUBLIC_API_KEY=your_public_api_key_here
```

### 4. Set up the database schema

```bash
npm run db:push
```

### 5. Run the app

```bash
npm run dev
```

Open **http://localhost:5001** — you'll be automatically logged in as a dev user. No Replit account needed.

> **Note:** Without a `PUBLIC_API_KEY`, the options chain will show simulated data. The Wheel Strategy backtester uses real Yahoo Finance historical prices regardless.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Any random string for session signing |
| `PUBLIC_API_KEY` | No | Public.com API key for live options data |
| `REPL_ID` | Replit only | Auto-set by Replit, enables Replit Auth |
