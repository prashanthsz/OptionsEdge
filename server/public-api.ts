const BASE_URL = "https://api.public.com";
const AUTH_URL = `${BASE_URL}/userapiauthservice/personal/access-tokens`;
const GATEWAY_URL = `${BASE_URL}/userapigateway`;

let accessToken: string | null = null;
let tokenExpiry = 0;
let accountId: string | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const secret = process.env.PUBLIC_API_KEY;
  if (!secret) throw new Error("PUBLIC_API_KEY not configured");

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ validityInMinutes: 60, secret }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  accessToken = data.accessToken;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  console.log("[public-api] Access token refreshed");
  return accessToken!;
}

async function getAccountId(): Promise<string> {
  if (accountId) return accountId;

  const token = await getAccessToken();
  const res = await fetch(`${GATEWAY_URL}/trading/account`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Account fetch failed (${res.status})`);

  const data = await res.json();
  const accounts = data.accounts || [];
  if (accounts.length === 0) throw new Error("No accounts found");

  accountId = accounts[0].accountId;
  console.log("[public-api] Account ID:", accountId);
  return accountId!;
}

async function apiPost(path: string, body: any): Promise<any> {
  const token = await getAccessToken();
  const acctId = await getAccountId();
  const url = `${GATEWAY_URL}/${path.replace("{ACCOUNT_ID}", acctId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function apiGet(path: string): Promise<any> {
  const token = await getAccessToken();
  const acctId = await getAccountId();
  const url = `${GATEWAY_URL}/${path.replace("{ACCOUNT_ID}", acctId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

const cache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export async function getStockQuote(symbol: string): Promise<any> {
  const cacheKey = `quote_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiPost("marketdata/{ACCOUNT_ID}/quotes", {
      instruments: [{ symbol: symbol.toUpperCase(), type: "EQUITY" }],
    });

    const quote = data.quotes?.[0];
    if (!quote || quote.outcome !== "SUCCESS") return null;

    const result = {
      symbol: quote.instrument.symbol,
      name: quote.instrument.name || symbol.toUpperCase(),
      price: parseFloat(quote.last) || 0,
      bid: parseFloat(quote.bid) || 0,
      ask: parseFloat(quote.ask) || 0,
      bidSize: quote.bidSize || 0,
      askSize: quote.askSize || 0,
      lastTimestamp: quote.lastTimestamp || null,
    };

    setCache(cacheKey, result, 15000);
    return result;
  } catch (err) {
    console.error(`[public-api] getStockQuote error for ${symbol}:`, err);
    return null;
  }
}

export async function getOptionExpirations(symbol: string): Promise<string[]> {
  const cacheKey = `exp_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiPost("marketdata/{ACCOUNT_ID}/option-expirations", {
      instrument: { symbol: symbol.toUpperCase(), type: "EQUITY" },
    });

    const expirations = data.expirations || [];
    setCache(cacheKey, expirations, 300000);
    return expirations;
  } catch (err) {
    console.error(`[public-api] getOptionExpirations error for ${symbol}:`, err);
    return [];
  }
}

export async function getOptionChain(symbol: string, expirationDate: string): Promise<any> {
  const cacheKey = `chain_${symbol}_${expirationDate}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiPost("marketdata/{ACCOUNT_ID}/option-chain", {
      instrument: { symbol: symbol.toUpperCase(), type: "EQUITY" },
      expirationDate,
    });

    const result = {
      baseSymbol: data.baseSymbol || symbol.toUpperCase(),
      calls: (data.calls || []).filter((c: any) => c.outcome === "SUCCESS").map(parseOptionLeg),
      puts: (data.puts || []).filter((p: any) => p.outcome === "SUCCESS").map(parseOptionLeg),
    };

    setCache(cacheKey, result, 30000);
    return result;
  } catch (err) {
    console.error(`[public-api] getOptionChain error:`, err);
    return { baseSymbol: symbol, calls: [], puts: [] };
  }
}

function parseOptionLeg(leg: any) {
  const sym = leg.instrument?.symbol || "";
  const match = sym.match(/(\w+?)(\d{6})([CP])(\d{8})/);
  let strike = 0;
  let type: "Call" | "Put" = "Call";
  if (match) {
    type = match[3] === "C" ? "Call" : "Put";
    strike = parseInt(match[4]) / 1000;
  }

  return {
    symbol: sym,
    type,
    strike,
    bid: parseFloat(leg.bid) || 0,
    ask: parseFloat(leg.ask) || 0,
    last: parseFloat(leg.last) || 0,
    bidSize: leg.bidSize || 0,
    askSize: leg.askSize || 0,
    lastTimestamp: leg.lastTimestamp || null,
  };
}

export async function getAccountInfo(): Promise<any> {
  try {
    return await apiGet("trading/account");
  } catch (err) {
    console.error("[public-api] getAccountInfo error:", err);
    return null;
  }
}

export async function getPortfolio(): Promise<any> {
  try {
    return await apiGet("trading/{ACCOUNT_ID}/portfolio/v2");
  } catch (err) {
    console.error("[public-api] getPortfolio error:", err);
    return null;
  }
}

export function isConfigured(): boolean {
  return !!process.env.PUBLIC_API_KEY;
}
